"""User-scoped desktop preferences for Conake Studio (no root access needed)."""

import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET


class SettingsError(Exception):
    """An actionable settings or desktop-session error."""


def _background_dir():
    installed = Path("/usr/share/backgrounds/conake")
    if installed.is_dir():
        return installed
    # Also support running Studio directly from a checkout for development.
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "assets/branding/wallpapers"
        if candidate.is_dir():
            return candidate
    return installed


BACKGROUNDS = _background_dir()
THEMES = {
    "sakura": {"name": "Sakura nights", "accent": "#f4a9c5", "panel": "#251d34",
               "wallpaper": str(BACKGROUNDS / "conake-afterlight.png")},
    "moonlit": {"name": "Moonlit lake", "accent": "#8ed9cf", "panel": "#152b3b",
                "wallpaper": str(BACKGROUNDS / "conake-moonlit.svg")},
    "neon": {"name": "Neon violet", "accent": "#b9a3ff", "panel": "#241443",
             "wallpaper": str(BACKGROUNDS / "conake-moonlit.svg")},
    "minimal": {"name": "Quiet mint", "accent": "#68d5bb", "panel": "#101820",
                "wallpaper": str(BACKGROUNDS / "conake-minimal.svg")},
}
if not Path(THEMES["minimal"]["wallpaper"]).exists():
    THEMES["minimal"]["wallpaper"] = str(BACKGROUNDS.parent / "wallpaper.svg")

DEFAULTS = {
    "theme": "sakura", "wallpaper": THEMES["sakura"]["wallpaper"],
    "wallpaper_style": "zoom", "panel_id": 1, "panel_position": "top",
    "panel_size": 40, "panel_length": 100, "panel_autohide": "always",
    "panel_opacity": 94, "panel_color": THEMES["sakura"]["panel"],
    "taskbar_labels": True, "dark_mode": True, "compositing": True,
    "desktop_icons": False, "font_size": 10, "clock_24h": True,
    "workspaces": 4, "welcome_on_login": True,
}
STYLES = {"center": 1, "tile": 2, "stretch": 3, "scaled": 4, "zoom": 5}
POSITIONS = {"top": 9, "bottom": 10, "left": 7, "right": 3}
AUTOHIDE = {"never": 0, "intelligent": 1, "always": 2}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
MAX_IMAGE_BYTES = 25 * 1024 * 1024


def config_dir():
    return Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "conake"


def wallpaper_dir():
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "conake/wallpapers"


def _atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _validate_preferences(values):
    prefs = {key: values.get(key, value) for key, value in DEFAULTS.items()}
    for key, options in (("theme", THEMES), ("wallpaper_style", STYLES),
                         ("panel_position", POSITIONS), ("panel_autohide", AUTOHIDE)):
        if not isinstance(prefs[key], str) or prefs[key] not in options:
            raise SettingsError(f"Choose a valid {key.replace('_', ' ')}.")
    for key, low, high in (("panel_id", 0, 10000), ("panel_size", 24, 72),
                           ("panel_length", 40, 100), ("panel_opacity", 40, 100),
                           ("font_size", 9, 16), ("workspaces", 1, 8)):
        if type(prefs[key]) is not int or not low <= prefs[key] <= high:
            raise SettingsError(f"{key.replace('_', ' ').capitalize()} must be between {low} and {high}.")
    for key in ("taskbar_labels", "dark_mode", "compositing", "desktop_icons", "clock_24h", "welcome_on_login"):
        if type(prefs[key]) is not bool:
            raise SettingsError(f"Choose on or off for {key.replace('_', ' ')}.")
    if not isinstance(prefs["panel_color"], str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", prefs["panel_color"]):
        raise SettingsError("Choose a taskbar color such as #251d34.")
    if not isinstance(prefs["wallpaper"], str) or not prefs["wallpaper"]:
        raise SettingsError("Choose a wallpaper first.")
    return prefs


def load_preferences():
    try:
        saved = json.loads((config_dir() / "settings.json").read_text())
        if not isinstance(saved, dict):
            return DEFAULTS.copy()
        # A damaged individual preference should not discard all saved choices.
        result = DEFAULTS.copy()
        for key in DEFAULTS:
            if key in saved:
                try:
                    result = _validate_preferences({**result, key: saved[key]})
                except SettingsError:
                    pass
        return result
    except (OSError, ValueError):
        return DEFAULTS.copy()


def _validate_image(path):
    from PIL import Image

    path = Path(path).expanduser().resolve()
    if path.suffix.lower() not in IMAGE_SUFFIXES or not path.is_file():
        raise SettingsError("Choose a PNG, JPEG, WebP, or SVG image file.")
    if not 0 < path.stat().st_size <= MAX_IMAGE_BYTES:
        raise SettingsError("Choose an image smaller than 25 MB.")
    try:
        if path.suffix.lower() == ".svg":
            data = path.read_bytes()
            if b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
                raise ValueError("Unsupported SVG document definition")
            root = ET.fromstring(data)
            if root.tag != "{http://www.w3.org/2000/svg}svg":
                raise ValueError("Not an SVG")
        else:
            with Image.open(path) as image:
                if image.width * image.height > 40_000_000:
                    raise SettingsError("Choose an image with no more than 40 million pixels.")
                image.verify()
    except (ValueError, OSError, ET.ParseError, Image.DecompressionBombError) as error:
        raise SettingsError("This image could not be read. Try another image.") from error
    return path


def import_wallpaper(path):
    source = _validate_image(path)
    data = source.read_bytes()
    suffix = source.suffix.lower()
    # PNG works with the stock XFCE image loaders; a WebP loader is optional.
    if suffix == ".webp":
        from PIL import Image, ImageOps
        with Image.open(source) as image:
            output = io.BytesIO()
            ImageOps.exif_transpose(image).convert("RGB").save(output, format="PNG")
            data = output.getvalue()
        if len(data) > MAX_IMAGE_BYTES:
            raise SettingsError("This WebP is too large after conversion. Choose a smaller image.")
        suffix = ".png"
    digest = hashlib.sha256(data).hexdigest()[:12]
    stem = re.sub(r"[^\w -]", "", source.stem)[:60].strip() or "wallpaper"
    destination = wallpaper_dir() / f"{stem}-{digest}{suffix}"
    _atomic_write(destination, data)
    return str(destination)


def list_wallpapers():
    paths = set()
    for directory in (BACKGROUNDS, wallpaper_dir()):
        if directory.is_dir():
            paths.update(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES)
    minimal = Path(THEMES["minimal"]["wallpaper"])
    if minimal.is_file():
        paths.add(minimal)
    entries = []
    for path in sorted(paths):
        stem = re.sub(r"-[0-9a-f]{12}$", "", path.stem.removeprefix("conake-"))
        label = "Quiet mint" if path == minimal else stem.replace("-", " ").title()
        entries.append((label, str(path)))
    return entries


def _query(*args, optional=False):
    try:
        result = subprocess.run(["xfconf-query", *args], capture_output=True, text=True,
                                timeout=8, env={**os.environ, "LC_ALL": "C"})
    except FileNotFoundError as error:
        raise SettingsError("Open Conake Studio inside an XFCE desktop with xfconf installed.") from error
    except subprocess.TimeoutExpired as error:
        raise SettingsError("The desktop settings service did not respond. Try again after logging into XFCE.") from error
    if result.returncode:
        if optional:
            return None
        detail = result.stderr.strip()[:250]
        raise SettingsError(f"XFCE could not update the setting. {detail}")
    return result.stdout.strip()


def _get(channel, prop, fallback=None):
    result = _query("-c", channel, "-p", prop, optional=True)
    return fallback if result is None else result


def _properties(channel):
    return (_query("-c", channel, "-l", optional=True) or "").splitlines()


def _set(channel, prop, kind, value):
    values = value if isinstance(value, (list, tuple)) else [value]
    command = ["-c", channel, "-p", prop, "-n"]
    if isinstance(value, (list, tuple)):
        command.append("-a")
    for item in values:
        command.extend(["-t", kind, "-s", str(item).lower() if isinstance(item, bool) else str(item)])
    _query(*command)


def _numeric_array(value):
    # Direct xfconf output includes an array-count header; ignore that line.
    return [int(line) for line in (value or "").splitlines() if re.fullmatch(r"\d+", line.strip())]


def available_panels():
    return _numeric_array(_get("xfce4-panel", "/panels"))


def _panel_plugins(panel_id):
    ids = _numeric_array(_get("xfce4-panel", f"/panels/panel-{panel_id}/plugin-ids"))
    return [(f"/plugins/plugin-{identifier}", _get("xfce4-panel", f"/plugins/plugin-{identifier}")) for identifier in ids]


def load_panel_settings(panel_id, prefs):
    result = dict(prefs, panel_id=panel_id)
    base = f"/panels/panel-{panel_id}"
    for key, prop, low, high in (("panel_size", "size", 24, 72), ("panel_length", "length", 40, 100)):
        try:
            result[key] = max(low, min(high, round(float(_get("xfce4-panel", f"{base}/{prop}", result[key])))))
        except (TypeError, ValueError):
            pass
    position = _get("xfce4-panel", f"{base}/position", "")
    match = re.search(r"p=(\d+);", position)
    if match:
        # Include corner/edge positions used by existing XFCE layouts.
        snap = int(match[1])
        result["panel_position"] = {1: "right", 2: "right", 3: "right", 4: "right", 5: "left", 6: "top", 7: "left", 8: "bottom", 9: "top", 10: "bottom", 11: "top", 12: "bottom"}.get(snap, result["panel_position"])
    hide = _get("xfce4-panel", f"{base}/autohide-behavior")
    result["panel_autohide"] = next((key for key, value in AUTOHIDE.items() if str(value) == hide), result["panel_autohide"])
    rgba = _get("xfce4-panel", f"{base}/background-rgba", "")
    try:
        channels = [float(line) for line in rgba.splitlines() if re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", line)]
        if len(channels) == 4 and all(0 <= value <= 1 for value in channels):
            result["panel_color"] = "#" + "".join(f"{round(value * 255):02x}" for value in channels[:3])
            result["panel_opacity"] = max(40, round(channels[3] * 100))
    except ValueError:
        pass
    for prop, plugin in _panel_plugins(panel_id):
        if plugin == "tasklist":
            result["taskbar_labels"] = _get("xfce4-panel", f"{prop}/show-labels", "true") == "true"
        if plugin == "clock":
            fmt = _get("xfce4-panel", f"{prop}/digital-time-format", "%H:%M")
            result["clock_24h"] = not any(token in fmt for token in ("%I", "%l", "%p", "%P", "%r"))
    return result


def _wallpaper_targets():
    bases = set()
    for prop in _properties("xfce4-desktop"):
        match = re.match(r"(/backdrop/screen\d+/monitor[^/]+/workspace\d+)/", prop)
        if match:
            bases.add(match[1])
    return sorted(bases)


def read_current_settings(saved):
    result = dict(saved)
    panels = available_panels()
    if panels:
        panel = result["panel_id"] if result["panel_id"] in panels else panels[0]
        result = load_panel_settings(panel, result)
    for base in _wallpaper_targets():
        path = _get("xfce4-desktop", f"{base}/last-image")
        if path and Path(path).is_file():
            result["wallpaper"] = path
            style = _get("xfce4-desktop", f"{base}/image-style")
            result["wallpaper_style"] = next((key for key, value in STYLES.items() if str(value) == style), "zoom")
            break
    theme = _get("xsettings", "/Net/ThemeName")
    if theme:
        result["dark_mode"] = "dark" in theme.lower()
    compositor = _get("xfwm4", "/general/use_compositing")
    if compositor is not None:
        result["compositing"] = compositor == "true"
    icons = _get("xfce4-desktop", "/desktop-icons/style")
    if icons is not None:
        result["desktop_icons"] = icons != "0"
    font = _get("xsettings", "/Gtk/FontName", "")
    try:
        result["font_size"] = max(9, min(16, int(font.rsplit(" ", 1)[-1])))
    except ValueError:
        pass
    try:
        result["workspaces"] = max(1, min(8, int(_get("xfwm4", "/general/workspace_count", result["workspaces"]))))
    except (TypeError, ValueError):
        pass
    autostart = config_dir().parent / "autostart/conake-welcome.desktop"
    if autostart.is_file():
        result["welcome_on_login"] = "Hidden=true" not in autostart.read_text()
    return result


def apply_settings(values):
    prefs = _validate_preferences(values)
    image = _validate_image(prefs["wallpaper"])
    prefs["wallpaper"] = str(image)
    _query("-l")  # Verify the session before changing anything.
    if prefs["panel_id"] not in available_panels():
        raise SettingsError("The selected taskbar no longer exists. Reopen Studio to refresh the panel list.")
    targets = _wallpaper_targets()
    if not targets:
        raise SettingsError("The XFCE desktop is not ready. Open Studio after the desktop has finished loading.")
    # Shared-wallpaper mode below uses workspace 0. A connected monitor may only
    # have properties for another workspace so far; initialize its shared image.
    targets = sorted(set(targets) | {re.sub(r"workspace\d+$", "workspace0", target) for target in targets})
    base = f"/panels/panel-{prefs['panel_id']}"
    for target in targets:
        _set("xfce4-desktop", f"{target}/last-image", "string", str(image))
        _set("xfce4-desktop", f"{target}/image-style", "int", STYLES[prefs["wallpaper_style"]])
    _set("xfce4-desktop", "/backdrop/single-workspace-mode", "bool", True)
    _set("xfce4-desktop", "/backdrop/single-workspace-number", "int", 0)
    _set("xfce4-desktop", "/desktop-icons/style", "int", 2 if prefs["desktop_icons"] else 0)
    _set("xfwm4", "/general/use_compositing", "bool", prefs["compositing"])
    _set("xfwm4", "/general/workspace_count", "int", prefs["workspaces"])
    _set("xfwm4", "/general/theme", "string", "Arc-Dark" if prefs["dark_mode"] else "Arc")
    _set("xsettings", "/Net/ThemeName", "string", "Arc-Dark" if prefs["dark_mode"] else "Arc")
    _set("xsettings", "/Net/IconThemeName", "string", "Papirus-Dark" if prefs["dark_mode"] else "Papirus")
    _set("xsettings", "/Gtk/FontName", "string", f"Noto Sans {prefs['font_size']}")
    _set("xfce4-panel", "/panels/dark-mode", "bool", prefs["dark_mode"])
    position = _get("xfce4-panel", f"{base}/position", "p=10;x=0;y=0")
    position = re.sub(r"^p=\d+", f"p={POSITIONS[prefs['panel_position']]}", position)
    _set("xfce4-panel", f"{base}/mode", "uint", 1 if prefs["panel_position"] in ("left", "right") else 0)
    _set("xfce4-panel", f"{base}/position", "string", position)
    _set("xfce4-panel", f"{base}/position-locked", "bool", True)
    _set("xfce4-panel", f"{base}/size", "uint", prefs["panel_size"])
    _set("xfce4-panel", f"{base}/icon-size", "uint", 0)
    _set("xfce4-panel", f"{base}/length", "double", prefs["panel_length"])
    _set("xfce4-panel", f"{base}/length-adjust", "bool", False)
    _set("xfce4-panel", f"{base}/autohide-behavior", "uint", AUTOHIDE[prefs["panel_autohide"]])
    color = prefs["panel_color"].lstrip("#")
    rgba = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [prefs["panel_opacity"] / 100]
    _set("xfce4-panel", f"{base}/background-style", "uint", 1)
    _set("xfce4-panel", f"{base}/background-rgba", "double", rgba)
    for prop, plugin in _panel_plugins(prefs["panel_id"]):
        if plugin == "tasklist":
            _set("xfce4-panel", f"{prop}/show-labels", "bool", prefs["taskbar_labels"])
        if plugin == "clock":
            _set("xfce4-panel", f"{prop}/mode", "uint", 2)
            _set("xfce4-panel", f"{prop}/digital-layout", "uint", 3)
            _set("xfce4-panel", f"{prop}/digital-time-format", "string", "%H:%M" if prefs["clock_24h"] else "%I:%M %p")
    # Override only our own welcome entry; leave other login applications alone.
    hidden = "false" if prefs["welcome_on_login"] else "true"
    entry = ("[Desktop Entry]\nType=Application\nName=Conake Welcome\n"
             "Exec=/usr/local/bin/conake-welcome\nOnlyShowIn=XFCE;\nTerminal=false\n"
             f"Hidden={hidden}\n")
    _atomic_write(config_dir().parent / "autostart/conake-welcome.desktop", entry.encode())
    # Persist only after every desktop write succeeds. On failure the UI explains
    # that some live settings may have changed and can be applied again.
    _atomic_write(config_dir() / "settings.json", (json.dumps(prefs, indent=2) + "\n").encode())


def open_settings(name):
    commands = {
        "appearance": ["xfce4-appearance-settings"], "display": ["xfce4-display-settings"],
        "keyboard": ["xfce4-keyboard-settings"], "mouse": ["xfce4-mouse-settings"],
        "panel": ["xfce4-panel", "--preferences"], "power": ["xfce4-power-manager-settings"],
        "notifications": ["xfce4-notifyd-config"],
    }
    if name not in commands:
        raise SettingsError("This settings shortcut is not available.")
    command = commands[name]
    if not shutil.which(command[0]):
        raise SettingsError("This settings tool is not installed in the current desktop.")
    subprocess.Popen(command, start_new_session=True)
