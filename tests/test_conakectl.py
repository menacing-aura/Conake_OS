"""Conake CLI regression tests; no host services are started or modified."""

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
from pathlib import Path
import subprocess
import tempfile
import tomllib
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "conake_control", ROOT / "apps/control/usr/share/conake/control/conake_control.py")
control = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(control)
SAMPLE = ROOT / "apps/control/etc/conake/system.toml"


class ConakeControlTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="conakectl-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        runner = mock.patch.object(control.subprocess, "run")
        self.run = runner.start()
        self.run.return_value = subprocess.CompletedProcess([], 0)
        self.addCleanup(runner.stop)

    def call(self, argv):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = control.main(argv)
        return code, stdout.getvalue(), stderr.getvalue()

    def test_literal_service_names_and_instances_are_normalized(self):
        for source, expected in (("NetworkManager", "NetworkManager.service"),
                                 ("conake-worker@desktop.service", "conake-worker@desktop.service"),
                                 ("dbus-org.freedesktop.resolve1", "dbus-org.freedesktop.resolve1.service")):
            self.assertEqual(control.service_name(source), expected)

    def test_unsafe_or_nonliteral_service_names_fail_before_processes(self):
        for unit in ("", "--all", "-x", "../ssh", "/ssh.service", "ssh;reboot", "$(reboot)",
                     "ssh*", "ss?", "a b", "ss\nh", r"hello\x20there", "x" * 256, None, False):
            with self.subTest(unit=unit), self.assertRaises(control.ControlError):
                control.manage_services("restart", [unit])
        self.run.assert_not_called()

    def test_dry_run_requires_no_root_and_never_spawns_a_process(self):
        with mock.patch.object(control.os, "geteuid", return_value=1000) as uid:
            code, output, error = self.call(["services", "restart", "NetworkManager", "lightdm", "--dry-run"])
        self.assertEqual(code, 0)
        self.assertEqual(error, "")
        self.assertEqual(output.strip(),
                         "systemctl --no-pager --no-ask-password --full restart -- NetworkManager.service lightdm.service")
        self.run.assert_not_called()
        uid.assert_not_called()

    def test_service_mutations_require_explicit_root(self):
        with mock.patch.object(control.os, "geteuid", return_value=1000):
            for action in ("start", "stop", "restart"):
                with self.subTest(action=action):
                    code, _, error = self.call(["services", action, "ssh"])
                    self.assertEqual(code, 1)
                    self.assertIn("requires root", error)
                    self.assertIn("--dry-run", error)
        self.run.assert_not_called()

    def test_service_transaction_uses_one_argument_list_and_keeps_systemd_ordering(self):
        with mock.patch.object(control.os, "geteuid", return_value=0):
            self.assertEqual(control.manage_services("start", ["second", "first"]), 0)
        self.run.assert_called_once_with(
            ["systemctl", "--no-pager", "--no-ask-password", "--full", "start", "--", "second.service", "first.service"],
            check=False, shell=False)

    def test_systemctl_failures_preserve_exit_status_and_output(self):
        self.run.return_value = subprocess.CompletedProcess([], 3)
        self.assertEqual(self.call(["services", "status", "absent"])[0], 3)
        self.assertNotIn("capture_output", self.run.call_args.kwargs)
        self.assertNotIn("stdout", self.run.call_args.kwargs)
        self.assertNotIn("stderr", self.run.call_args.kwargs)

    def test_missing_binaries_and_execution_errors_are_actionable_without_traceback(self):
        for exception, expected in ((FileNotFoundError(), "not installed"),
                                    (PermissionError(13, "Permission denied"), "Permission denied")):
            self.run.side_effect = exception
            for command in (["services", "list"], ["logs"]):
                with self.subTest(command=command, exception=exception):
                    code, _, error = self.call(command)
                    self.assertEqual(code, 1)
                    self.assertIn(expected, error)
                    self.assertNotIn("Traceback", error)

    def test_logs_are_bounded_and_noninteractive(self):
        self.assertEqual(self.call(["logs", "--unit", "NetworkManager", "--lines", "25"])[0], 0)
        self.run.assert_called_once_with(
            ["journalctl", "--no-pager", "--lines", "25", "--unit", "NetworkManager.service"],
            check=False, shell=False)

    def test_invalid_logs_never_launch_journalctl(self):
        for argv in (["--unit", "x*"], ["--lines", "0"], ["--lines", "1001"], ["--lines", "-1"]):
            with self.subTest(argv=argv):
                self.assertEqual(self.call(["logs", *argv])[0], 1)
        self.run.assert_not_called()

    def test_configuration_check_and_show_do_not_mutate_services(self):
        for action in ("check", "show"):
            code, output, error = self.call(["--config", str(SAMPLE), "config", action])
            self.assertEqual((code, error), (0, ""))
            if action == "show":
                self.assertEqual(control.validate_config(tomllib.loads(output)), control.load_config(SAMPLE))
        self.run.assert_not_called()

    def test_malformed_config_and_missing_files_have_no_traceback(self):
        path = self.directory / "invalid.toml"
        for contents in (b"[broken", b'[desktop]\ncommand = "\xff"'):
            path.write_bytes(contents)
            code, _, error = self.call(["--config", str(path), "config", "check"])
            self.assertEqual(code, 1)
            self.assertIn("Invalid TOML", error)
            self.assertNotIn("Traceback", error)
        path.unlink()
        code, _, error = self.call(["--config", str(path), "config", "check"])
        self.assertEqual(code, 1)
        self.assertIn("Cannot read configuration", error)
        self.run.assert_not_called()

    def test_typed_configuration_rejects_unknown_and_executable_settings(self):
        for config in ({"desktop": {"command": "sh -c reboot"}}, {"desktop": {"command": False}},
                       {"desktop": "string"}, {"services": {"managed": "ssh"}},
                       {"services": {"managed": [True]}}, {"services": {"managed": ["--all"]}},
                       {"services": {"managed": ["ssh", "ssh.service"]}},
                       {"services": {"start": ["ssh"]}}, {"remote": {"enabled": True}}):
            with self.subTest(config=config), self.assertRaises(control.ControlError):
                control.validate_config(config)
        self.run.assert_not_called()

    def test_managed_inventory_filters_list_without_starting_anything(self):
        self.assertEqual(self.call(["--config", str(SAMPLE), "services", "list", "--managed"])[0], 0)
        command = self.run.call_args.args[0]
        self.assertIn("list-units", command)
        self.assertEqual(command[command.index("--") + 1:], control.load_config(SAMPLE)["services"]["managed"])

    def test_empty_managed_inventory_does_not_list_all_services(self):
        path = self.directory / "empty.toml"
        path.write_text("[services]\nmanaged = []\n")
        code, output, _ = self.call(["--config", str(path), "services", "list", "--managed"])
        self.assertEqual(code, 0)
        self.assertIn("No managed services", output)
        self.run.assert_not_called()

    def test_desktop_launches_only_as_normal_user(self):
        with mock.patch.object(control.os, "geteuid", return_value=0):
            code, _, error = self.call(["desktop"])
        self.assertEqual(code, 1)
        self.assertIn("normal desktop user", error)
        self.run.assert_not_called()
        with mock.patch.object(control.os, "geteuid", return_value=1000):
            self.assertEqual(self.call(["--config", str(SAMPLE), "desktop"])[0], 0)
        self.run.assert_called_once_with(["conake-settings"], check=False, shell=False)

    def test_status_handles_missing_procfs_without_external_commands(self):
        values = control.system_status(self.directory / "missing-os-release", self.directory / "missing-proc")
        self.assertEqual(values["OS"], "Unavailable")
        self.assertEqual(values["PID 1"], "Unavailable")
        self.assertEqual(values["Memory available"], "Unavailable")
        self.run.assert_not_called()

    def test_status_reports_non_systemd_pid1_and_memory(self):
        release = self.directory / "os-release"
        release.write_text('NAME=Debian\nPRETTY_NAME="Conake OS"\n')
        (self.directory / "1").mkdir()
        (self.directory / "1/comm").write_text("python3\n")
        (self.directory / "meminfo").write_text("MemTotal: 2097152 kB\nMemAvailable: 1048576 kB\n")
        result = control.system_status(release, self.directory)
        self.assertEqual(result["OS"], "Conake OS")
        self.assertEqual(result["PID 1"], "python3")
        self.assertEqual(result["Memory total"], "2048 MiB")
        self.assertEqual(result["Memory available"], "1024 MiB")

    def test_status_tolerates_malformed_os_release_and_memory(self):
        release = self.directory / "os-release"
        release.write_text('NAME=Conake\nPRETTY_NAME="unterminated\n')
        (self.directory / "meminfo").write_text("MemTotal: -1 kB\nMemAvailable: unknown kB\n")
        result = control.system_status(release, self.directory)
        self.assertEqual(result["OS"], "Conake")
        self.assertEqual(result["Memory total"], "Unavailable")
        self.assertEqual(result["Memory available"], "Unavailable")

    def test_unsupported_api_actions_fail_before_execution(self):
        for action, names in (("enable", ["ssh"]), ("restart", []), ("reboot", [])):
            with self.subTest(action=action), self.assertRaises(control.ControlError):
                control.service_command(action, names)
        self.run.assert_not_called()

    def test_package_names_reject_options_paths_globs_versions_and_shell_input(self):
        for name in ("--allow-unauthenticated", "-y", "/tmp/package.deb", "./pkg.deb", "python*", "python?",
                     "apt;reboot", "apt\nssh", "apt=1.0", "apt/trixie", "apt:linux-any", "apt:any", "X", "a", None):
            with self.subTest(name=name), self.assertRaises(control.ControlError):
                control.package_command("install", [name])
        self.run.assert_not_called()

    def test_package_names_use_architecture_suffix_to_keep_modifiers_literal(self):
        self.assertEqual(control.package_name("g++"), "g++:native")
        self.assertEqual(control.package_name("python3.11"), "python3.11:native")
        self.assertEqual(control.package_name("libc6:amd64"), "libc6:amd64")
        self.assertEqual(control.package_name("foo-"), "foo-:native")

    def test_all_package_dry_runs_skip_root_and_subprocesses(self):
        with mock.patch.object(control.os, "geteuid", return_value=1000) as uid:
            for action in ("install", "remove", "update", "upgrade"):
                packages = ["firefox-esr"] if action in {"install", "remove"} else []
                code, output, error = self.call(["packages", action, *packages, "--dry-run"])
                self.assertEqual((code, error), (0, ""))
                self.assertTrue(output.startswith(f"apt-get {action}"))
        uid.assert_not_called()
        self.run.assert_not_called()

    def test_package_mutations_require_explicit_root(self):
        with mock.patch.object(control.os, "geteuid", return_value=1000):
            for action in ("install", "remove", "update", "upgrade"):
                packages = ["firefox-esr"] if action in {"install", "remove"} else []
                code, _, error = self.call(["packages", action, *packages])
                self.assertEqual(code, 1)
                self.assertIn("requires root", error)
        self.run.assert_not_called()

    def test_package_transactions_use_exact_preflight_and_keep_prompts_and_signatures(self):
        self.run.side_effect = [subprocess.CompletedProcess([], 0, "Package: python3.11\nVersion: 3.11.0\n"),
                                subprocess.CompletedProcess([], 0)]
        with mock.patch.object(control.os, "geteuid", return_value=0):
            self.assertEqual(self.call(["packages", "install", "python3.11"])[0], 0)
        self.assertEqual(self.run.call_args_list[0], mock.call(
            ["apt-cache", "show", "--no-all-versions", "--", "python3.11:native"],
            check=False, shell=False, stdout=subprocess.PIPE, text=True))
        self.assertEqual(self.run.call_args_list[1], mock.call(
            ["apt-get", "install", "--", "python3.11:native"], check=False, shell=False))

    def test_no_exact_package_match_cannot_fall_back_to_broad_regex_transaction(self):
        self.run.return_value = subprocess.CompletedProcess([], 0, "Package: python311\nVersion: 1\n")
        with mock.patch.object(control.os, "geteuid", return_value=0):
            code, _, error = self.call(["packages", "install", "python3.11"])
        self.assertEqual(code, 1)
        self.assertIn("No exact package", error)
        self.assertEqual(self.run.call_count, 1)

    def test_package_preflight_errors_are_preserved_and_abort_transaction(self):
        self.run.return_value = subprocess.CompletedProcess([], 100, "")
        with mock.patch.object(control.os, "geteuid", return_value=0):
            self.assertEqual(self.call(["packages", "remove", "missing"])[0], 100)
        self.assertEqual(self.run.call_count, 1)

    def test_apt_transaction_errors_are_preserved_without_capturing_output(self):
        self.run.return_value = subprocess.CompletedProcess([], 100)
        with mock.patch.object(control.os, "geteuid", return_value=0):
            self.assertEqual(self.call(["packages", "upgrade"])[0], 100)
        self.run.assert_called_once_with(["apt-get", "upgrade"], check=False, shell=False)

    def test_metadata_update_fails_on_partial_download_errors(self):
        self.assertEqual(control.package_command("update"), ["apt-get", "update", "--error-on=any"])

    def test_read_only_package_queries_need_no_root_and_search_is_literal(self):
        with mock.patch.object(control.os, "geteuid", return_value=1000) as uid:
            self.assertEqual(self.call(["packages", "search", "g++"])[0], 0)
            self.run.assert_called_once_with(["apt-cache", "search", "--names-only", "--", r"g\+\+"], check=False, shell=False)
            self.assertEqual(self.call(["packages", "list"])[0], 0)
        uid.assert_not_called()
        self.assertEqual(self.run.call_args.args[0][0], "dpkg-query")

    def test_package_executable_entrypoint_uses_same_commands(self):
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            self.assertEqual(control.package_main(["update", "--dry-run"]), 0)
        self.assertEqual(stdout.getvalue().strip(), "apt-get update --error-on=any")
        self.run.assert_not_called()

    def test_missing_package_tools_report_dependency_without_traceback(self):
        self.run.side_effect = FileNotFoundError()
        code, _, error = self.call(["packages", "search", "firefox"])
        self.assertEqual(code, 1)
        self.assertIn("Install apt", error)
        self.assertNotIn("Traceback", error)


if __name__ == "__main__":
    unittest.main()
