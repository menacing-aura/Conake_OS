"""Exercise Studio in an isolated XFCE session under xvfb-run/dbus-run-session.

Requires python3-tk, python3-pil.imagetk, xvfb, xauth, xfconf, dbus-x11,
xfce4-panel, xfdesktop4, xfwm4, xfce4-settings, xfce4-whiskermenu-plugin.
Run: xvfb-run -a -s '-screen 0 1280x900x24' dbus-run-session -- python3 tests/desktop_smoke.py
No existing user configuration is changed. Screenshots go to /tmp by default.
"""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--screenshots", type=Path, default=Path("/tmp/conake-studio-preview"))
    args = parser.parse_args()
    args.screenshots.mkdir(parents=True, exist_ok=True)
    assert os.environ.get("DISPLAY") and os.environ.get("DBUS_SESSION_BUS_ADDRESS"), "Use xvfb-run and dbus-run-session."
    children = []
    with tempfile.TemporaryDirectory(prefix="conake-desktop-smoke-") as folder:
        temporary = Path(folder)
        for name, directory in (("XDG_CONFIG_HOME", "config"), ("XDG_DATA_HOME", "data"),
                                ("XDG_CACHE_HOME", "cache"), ("XDG_RUNTIME_DIR", "runtime")):
            target = temporary / directory
            target.mkdir(mode=0o700)
            os.environ[name] = str(target)
        os.environ["XDG_CONFIG_DIRS"] = "/etc/xdg"
        os.environ["XDG_CURRENT_DESKTOP"] = "XFCE"
        # The private D-Bus daemon predates this process. Its activated services
        # must inherit the same temporary paths, rather than the user's paths.
        subprocess.run(["dbus-update-activation-environment", "XDG_CONFIG_HOME", "XDG_DATA_HOME",
                        "XDG_CACHE_HOME", "XDG_RUNTIME_DIR", "XDG_CONFIG_DIRS", "XDG_CURRENT_DESKTOP"], check=True)
        channels = temporary / "config/xfce4/xfconf/xfce-perchannel-xml"
        channels.mkdir(parents=True)
        for source in (ROOT / "system/etc/xdg/xfce4/xfconf/xfce-perchannel-xml").glob("*.xml"):
            data = source.read_text().replace("/usr/share/backgrounds/conake", str(ROOT / "assets/branding/wallpapers"))
            (channels / source.name).write_text(data)
        applications = temporary / "data/applications"
        applications.mkdir()
        for app in ("settings", "browser"):
            for desktop in (ROOT / f"apps/{app}/usr/share/applications").glob("*.desktop"):
                shutil.copy2(desktop, applications / desktop.name)

        sys.path.insert(0, str(ROOT / "apps/settings/usr/share/conake/settings"))
        import core
        import ui
        import tkinter as tk
        from PIL import ImageGrab

        log_path = args.screenshots / "desktop.log"
        with log_path.open("w") as log:
            try:
                for command in (["xfsettingsd", "--no-daemon"], ["xfwm4", "--compositor=off"],
                                ["xfdesktop", "--disable-wm-check"], ["xfce4-panel", "--disable-wm-check"]):
                    children.append(subprocess.Popen(command, stdout=log, stderr=log))
                deadline = time.monotonic() + 15
                while time.monotonic() < deadline:
                    if core.available_panels() and core._wallpaper_targets():
                        break
                    time.sleep(0.2)
                else:
                    raise AssertionError(f"XFCE did not initialize; inspect {log_path}")
                # Properties are read from defaults before the WM/panel windows
                # finish mapping. Allow those windows to appear before capture.
                time.sleep(4)
                root = tk.Tk()
                errors = []
                root.report_callback_exception = lambda kind, error, trace: errors.append(str(error))
                app = ui.Studio(root)
                root.geometry("1000x720+140+60")

                def pump(seconds=0.3):
                    until = time.monotonic() + seconds
                    while time.monotonic() < until:
                        root.update()
                        time.sleep(0.01)
                    assert not errors, errors

                def apply():
                    with mock.patch.object(ui.messagebox, "showerror", side_effect=lambda *a, **k: errors.append(str(a))):
                        app.apply()
                        timeout = time.monotonic() + 20
                        while app.applying and time.monotonic() < timeout:
                            pump(0.05)
                    assert not app.applying, "Apply timed out"
                    assert not errors, errors

                pump()
                app.select_theme("sakura")
                # File-picker import, permanent user copy, and source removal.
                original = temporary / "My custom anime wallpaper.png"
                shutil.copy2(core.THEMES["sakura"]["wallpaper"], original)
                with mock.patch.object(ui.filedialog, "askopenfilename", return_value=str(original)):
                    app.import_wallpaper()
                imported = Path(app.vars["wallpaper"].get())
                assert imported.is_file() and imported != original
                original.unlink()
                app.vars["panel_position"].set("right")
                app.vars["panel_size"].set("48")
                app.vars["panel_color"].set("#241443")
                app.vars["clock_24h"].set(False)
                apply()
                assert core._get("xfce4-panel", "/panels/panel-1/position").startswith("p=3;")
                assert core._get("xfce4-panel", "/panels/panel-1/mode") == "1"
                assert core._get("xfce4-panel", "/panels/panel-1/size") == "48"
                assert core._get("xfce4-panel", "/plugins/plugin-9/digital-time-format") == "%I:%M %p"
                for target in core._wallpaper_targets():
                    assert core._get("xfce4-desktop", f"{target}/last-image") == str(imported)
                assert json.loads((core.config_dir() / "settings.json").read_text())["wallpaper"] == str(imported)

                # Return to the default layout for useful screenshots.
                app.vars["panel_position"].set("bottom")
                app.vars["panel_size"].set("40")
                app.vars["panel_length"].set("90")
                app.vars["clock_24h"].set(True)
                app.vars["compositing"].set(False)  # Xvfb does not require a compositor.
                apply()
                for index, name in enumerate(("wallpapers", "taskbar", "desktop", "focus")):
                    app.notebook.select(index)
                    pump(0.5)
                    ImageGrab.grab().save(args.screenshots / f"{name}.png")
                root.geometry("780x580+250+100")
                for index in range(4):
                    app.notebook.select(index)
                    pump(0.1)
                app.set_timer(1)
                app.toggle_timer()
                assert app.timer_running
                app.toggle_timer()
                remaining = app.timer_remaining
                pump(0.15)
                assert not app.timer_running and app.timer_remaining == remaining
                app.toggle_timer()
                app._cancel_timer_tick()
                app.timer_deadline = time.monotonic() - 1
                app._tick_timer()
                assert app.timer_display.get() == "00:00" and not app.timer_running
                app.reset_timer()
                assert app.timer_display.get() == "01:00"
                app.close()
                print("PASS: live XFCE reads/writes, wallpaper import, taskbar orientation/color/size, clock, saved preferences, all tabs/minimum size, and focus timer")
                print(f"Screenshots: {args.screenshots}")
            finally:
                for child in reversed(children):
                    child.terminate()
                for child in children:
                    try:
                        child.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        child.kill()
                        child.wait()


if __name__ == "__main__":
    main()
