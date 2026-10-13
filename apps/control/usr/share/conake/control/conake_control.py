"""Small, explicit adapters for the existing Conake Linux system services.

This module does not replace PID 1 or apply configuration implicitly. Service
transactions remain with systemd, which owns dependency ordering and PIDs.
"""

import argparse
import json
import os
from pathlib import Path
import platform
import re
import shlex
import subprocess
import sys
import tomllib


DEFAULT_CONFIG = Path("/etc/conake/system.toml")
SERVICE_ACTIONS = {"start", "stop", "restart"}
UNIT_PATTERN = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.:@-]*", re.ASCII)
PACKAGE_PATTERN = re.compile(r"[a-z0-9][a-z0-9+.-]+(?::[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)?", re.ASCII)
PACKAGE_ACTIONS = {"install", "remove", "update", "upgrade"}


class ControlError(Exception):
    """An error suitable for display without a Python traceback."""


def service_name(value):
    """Validate a literal service name, accepting an omitted .service suffix.

    Glob patterns, option prefixes, paths and systemd escape sequences are not
    accepted. Callers must address a specific service or service instance.
    """
    if not isinstance(value, str) or not UNIT_PATTERN.fullmatch(value):
        raise ControlError(f"Invalid service name: {value!r}. Use a name such as NetworkManager.service.")
    name = value if value.endswith(".service") else value + ".service"
    if len(name) > 255:
        raise ControlError("Service names must be at most 255 characters including .service.")
    return name


def validate_config(data):
    """Return a normalized configuration; reject unknown or mistyped fields."""
    if not isinstance(data, dict):
        raise ControlError("Configuration must contain TOML tables.")
    schema = {"desktop": {"command"}, "services": {"managed"}}
    unknown = data.keys() - schema.keys()
    if unknown:
        raise ControlError(f"Unknown configuration table: {sorted(unknown)[0]}.")
    for section, fields in schema.items():
        table = data.get(section, {})
        if not isinstance(table, dict):
            raise ControlError(f"[{section}] must be a TOML table.")
        unknown = table.keys() - fields
        if unknown:
            raise ControlError(f"Unknown setting: {section}.{sorted(unknown)[0]}.")
    command = data.get("desktop", {}).get("command", "conake-settings")
    if command != "conake-settings":
        raise ControlError('desktop.command must be "conake-settings" in this release.')
    managed = data.get("services", {}).get("managed", [])
    if not isinstance(managed, list) or any(not isinstance(name, str) for name in managed):
        raise ControlError("services.managed must be an array of service names.")
    names = [service_name(name) for name in managed]
    if len(names) != len(set(names)):
        raise ControlError("services.managed contains duplicate service names.")
    return {"desktop": {"command": command}, "services": {"managed": names}}


def load_config(path=DEFAULT_CONFIG):
    """Read and validate a TOML file without executing or applying anything."""
    path = Path(path)
    try:
        with path.open("rb") as stream:
            data = tomllib.load(stream)
    except (tomllib.TOMLDecodeError, UnicodeError) as error:
        raise ControlError(f"Invalid TOML in {path}: {error}") from error
    except OSError as error:
        raise ControlError(f"Cannot read configuration {path}: {error.strerror}. Use --config PATH to select a file.") from error
    return validate_config(data)


def format_config(config):
    """Render the supported configuration schema as valid TOML."""
    names = ", ".join(json.dumps(name) for name in config["services"]["managed"])
    return ('[desktop]\ncommand = "conake-settings"\n\n'
            f"[services]\nmanaged = [{names}]")


def _read_text(path):
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except (OSError, UnicodeError):
        return ""


def system_status(os_release="/etc/os-release", proc="/proc"):
    """Collect a read-only summary, including on hosts without systemd/procfs."""
    release = {}
    for line in _read_text(os_release).splitlines():
        key, separator, value = line.partition("=")
        if separator and key in {"PRETTY_NAME", "NAME"}:
            try:
                tokens = shlex.split(value, comments=True)
            except ValueError:
                continue
            if len(tokens) == 1:
                release[key] = tokens[0]
    memory = {}
    for line in _read_text(Path(proc) / "meminfo").splitlines():
        key, separator, value = line.partition(":")
        parts = value.split()
        if separator and key in {"MemTotal", "MemAvailable"} and len(parts) == 2 and parts[1] == "kB":
            try:
                number = int(parts[0])
            except ValueError:
                continue
            if number >= 0:
                memory[key] = number // 1024
    return {
        "OS": release.get("PRETTY_NAME", release.get("NAME", "Unavailable")),
        "Kernel": platform.release(),
        "PID 1": _read_text(Path(proc) / "1/comm") or "Unavailable",
        "Memory total": f"{memory['MemTotal']} MiB" if "MemTotal" in memory else "Unavailable",
        "Memory available": f"{memory['MemAvailable']} MiB" if "MemAvailable" in memory else "Unavailable",
    }


def run_command(argv, *, capture=False):
    """Run one explicit argument list; inherit output and preserve exit status."""
    try:
        options = {"stdout": subprocess.PIPE, "text": True} if capture else {}
        result = subprocess.run(argv, check=False, shell=False, **options)
    except FileNotFoundError as error:
        package = {"systemctl": "systemd", "journalctl": "systemd", "apt-get": "apt",
                   "apt-cache": "apt", "dpkg-query": "dpkg"}.get(argv[0], "Conake Studio")
        raise ControlError(f"{argv[0]} is not installed or is not on PATH. Install {package} and try again.") from error
    except OSError as error:
        raise ControlError(f"Cannot run {argv[0]}: {error.strerror}.") from error
    # Shell exit convention for a child terminated by a signal.
    code = result.returncode if result.returncode >= 0 else 128 - result.returncode
    return (code, result.stdout) if capture else code


def package_name(value):
    """Validate a literal Debian package; pin implicit architecture to native.

    The architecture suffix prevents a trailing +/- in an actual package name
    from acting as an APT install/remove override. Wildcards, versions and local
    package paths are intentionally unsupported.
    """
    if not isinstance(value, str) or not PACKAGE_PATTERN.fullmatch(value) or len(value) > 255:
        raise ControlError(f"Invalid package name: {value!r}. Use a Debian name such as firefox-esr or libc6:amd64.")
    name, separator, architecture = value.partition(":")
    if separator and "any" in architecture.split("-"):
        raise ControlError("Choose a specific package architecture, such as amd64 or arm64, not an architecture wildcard.")
    return value if separator else name + ":native"


def package_command(action, packages=()):
    """Construct an APT command without disabling signature checks or prompts."""
    if action not in PACKAGE_ACTIONS:
        raise ControlError(f"Unsupported package action: {action!r}.")
    names = [package_name(name) for name in packages]
    if action in {"install", "remove"} and not names:
        raise ControlError(f"Choose at least one package to {action}.")
    if action in {"update", "upgrade"} and names:
        raise ControlError(f"{action} does not accept package names. Use install to update a specific package.")
    command = ["apt-get", action]
    # Treat a partly failed metadata refresh as a failure, even with old lists.
    if action == "update":
        command.append("--error-on=any")
    if names:
        command += ["--", *names]
    return command


def manage_packages(action, packages=(), dry_run=False):
    """Run an explicit APT transaction; no repository, trust or auto-yes changes."""
    command = package_command(action, packages)
    if dry_run:
        print(shlex.join(command))
        return 0
    if os.geteuid() != 0:
        raise ControlError("Changing packages requires root. Review --dry-run first, then rerun explicitly with sudo conakepkg.")
    if action in {"install", "remove"}:
        names = command[command.index("--") + 1:]
        # apt-get can treat an unknown dotted name as a regex. Reject that
        # fallback by requiring an exact metadata record before its transaction.
        code, output = run_command(["apt-cache", "show", "--no-all-versions", "--", *names], capture=True)
        if code:
            return code
        found = {line.removeprefix("Package: ") for line in output.splitlines() if line.startswith("Package: ")}
        for name in names:
            if name.split(":")[0] not in found:
                raise ControlError(f"No exact package named {name!r} found. Check its spelling and refresh metadata with conakepkg update.")
    return run_command(command)


def add_package_commands(parser):
    actions = parser.add_subparsers(dest="package_action", required=True)
    descriptions = {"install": "install or update named packages from configured APT repositories",
                    "remove": "uninstall named packages, keeping configuration files",
                    "update": "refresh repository metadata; does not upgrade installed packages",
                    "upgrade": "upgrade installed packages without removing packages"}
    for action, description in descriptions.items():
        subparser = actions.add_parser(action, help=description, description=description)
        if action in {"install", "remove"}:
            subparser.add_argument("packages", nargs="+", metavar="PACKAGE")
        subparser.add_argument("--dry-run", action="store_true", help="print the transaction command without running it or checking repositories")
    actions.add_parser("list", help="list packages known to dpkg, with version and install status")
    search = actions.add_parser("search", help="search package names for a literal text fragment")
    search.add_argument("query", metavar="TEXT")


def dispatch_packages(args):
    if args.package_action == "list":
        return run_command(["dpkg-query", "--show", "--showformat=${binary:Package}\t${Version}\t${db:Status-Abbrev}\n"])
    if args.package_action == "search":
        if not args.query.strip() or len(args.query) > 128 or any(ord(char) < 32 for char in args.query):
            raise ControlError("Search text must contain 1–128 printable characters.")
        # apt-cache search uses a regex; escape it so the CLI accepts literal text.
        return run_command(["apt-cache", "search", "--names-only", "--", re.escape(args.query)])
    return manage_packages(args.package_action, getattr(args, "packages", ()), args.dry_run)


def package_main(argv=None):
    parser = argparse.ArgumentParser(prog="conakepkg", description="ConakePKG: Python front end to Debian APT and its configured repository trust.")
    add_package_commands(parser)
    args = parser.parse_args(argv)
    try:
        return dispatch_packages(args)
    except ControlError as error:
        print(f"conakepkg: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130


def service_command(action, units=()):
    """Construct one systemd transaction rather than manually sorting services."""
    if action not in SERVICE_ACTIONS | {"status", "list"}:
        raise ControlError(f"Unsupported service action: {action!r}.")
    names = [service_name(unit) for unit in units]
    if action != "list" and not names:
        raise ControlError("Choose at least one service name.")
    command = ["systemctl", "--no-pager", "--no-ask-password", "--full"]
    if action == "list":
        command += ["list-units", "--type=service", "--all"]
    else:
        command.append(action)
    if names:
        command += ["--", *names]
    return command


def manage_services(action, units=(), dry_run=False):
    """Run/preview a service transaction; mutations need an explicit root caller."""
    command = service_command(action, units)
    if dry_run:
        if action not in SERVICE_ACTIONS:
            raise ControlError("--dry-run is supported for start, stop and restart.")
        print(shlex.join(command))
        return 0
    if action in SERVICE_ACTIONS and os.geteuid() != 0:
        raise ControlError("Changing system services requires root. Review --dry-run first, then rerun explicitly with sudo conakectl services.")
    return run_command(command)


def log_command(unit=None, lines=100):
    """Construct a bounded journal query with no pager or follow mode."""
    if type(lines) is not int or not 1 <= lines <= 1000:
        raise ControlError("Log line count must be between 1 and 1000.")
    command = ["journalctl", "--no-pager", "--lines", str(lines)]
    if unit is not None:
        command += ["--unit", service_name(unit)]
    return command


def open_desktop(config_path=DEFAULT_CONFIG):
    """Launch Studio in the user's existing desktop session, never as root."""
    if os.geteuid() == 0:
        raise ControlError("Open desktop settings as your normal desktop user, without sudo.")
    config = load_config(config_path)
    return run_command([config["desktop"]["command"]])


def build_parser():
    parser = argparse.ArgumentParser(description="Manage Conake using its existing Linux services.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG,
                        help="TOML file for config, desktop and services list --managed (default: %(default)s)")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("status", help="show system, memory and PID 1 information")
    commands.add_parser("desktop", help="open Conake Studio in your desktop session")
    packages = commands.add_parser("packages", help="ConakePKG: use Debian APT and its configured repository trust")
    add_package_commands(packages)
    services = commands.add_parser("services", help="inspect or manage systemd services")
    actions = services.add_subparsers(dest="action", required=True)
    listing = actions.add_parser("list", help="list loaded services, including inactive ones")
    listing.add_argument("--managed", action="store_true", help="only list names in services.managed")
    for action in ("status", "start", "stop", "restart"):
        subparser = actions.add_parser(action, help=f"{action} one or more services")
        subparser.add_argument("units", nargs="+", metavar="UNIT")
        if action in SERVICE_ACTIONS:
            subparser.add_argument("--dry-run", action="store_true", help="print the command without running it")
    logs = commands.add_parser("logs", help="read recent journal entries (permissions follow journalctl)")
    logs.add_argument("--unit", help="only show one service's logs")
    logs.add_argument("--lines", type=int, default=100, help="number of entries, 1–1000 (default: 100)")
    configuration = commands.add_parser("config", help="inspect or validate TOML; does not apply changes")
    configuration.add_argument("action", choices=("show", "check"))
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        if args.command == "status":
            for key, value in system_status().items():
                print(f"{key}: {value}")
            return 0
        if args.command == "desktop":
            return open_desktop(args.config)
        if args.command == "packages":
            return dispatch_packages(args)
        if args.command == "services":
            units = getattr(args, "units", ())
            if args.action == "list" and args.managed:
                units = load_config(args.config)["services"]["managed"]
                if not units:
                    print("No managed services configured.")
                    return 0
            return manage_services(args.action, units, getattr(args, "dry_run", False))
        if args.command == "logs":
            return run_command(log_command(args.unit, args.lines))
        if args.command == "config":
            config = load_config(args.config)
            print(format_config(config) if args.action == "show" else f"Configuration valid: {args.config}. No settings applied.")
            return 0
    except ControlError as error:
        print(f"conakectl: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
