"""Regression coverage for user-scoped Conake Studio settings.

Run with: python3 -m unittest discover -s tests -p 'test_desktop_settings.py'
The fake xfconf service models CLI output and failures without a desktop session.
"""

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

from PIL import Image


CORE_PATH = Path(__file__).resolve().parents[1] / "apps/settings/usr/share/conake/settings/core.py"
SPEC = importlib.util.spec_from_file_location("conake_settings_core", CORE_PATH)
core = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(core)


class FakeXfconf:
    """Keep unrelated panels and plugins present to detect overly broad changes."""

    def __init__(self):
        self.state = {
            ("xfce4-panel", "/panels"): [2, 9],
            ("xfce4-panel", "/panels/panel-2/plugin-ids"): [20, 21],
            ("xfce4-panel", "/panels/panel-9/plugin-ids"): [90, 91, 92],
            ("xfce4-panel", "/panels/panel-2/size"): "30",
            ("xfce4-panel", "/panels/panel-9/position"): "p=10;x=2500;y=1000",
            ("xfce4-panel", "/panels/panel-9/length"): "75",
            ("xfce4-panel", "/plugins/plugin-20"): "tasklist",
            ("xfce4-panel", "/plugins/plugin-21"): "clock",
            ("xfce4-panel", "/plugins/plugin-90"): "tasklist",
            ("xfce4-panel", "/plugins/plugin-91"): "clock",
            ("xfce4-panel", "/plugins/plugin-92"): "launcher",
            ("xfce4-panel", "/plugins/plugin-20/show-labels"): "true",
            ("xfce4-panel", "/plugins/plugin-21/digital-time-format"): "%H:%M:%S",
            ("xfce4-panel", "/plugins/plugin-92/items"): ["firefox.desktop"],
            ("xfce4-desktop", "/backdrop/screen0/monitoreDP-1/workspace0/last-image"): "/old/internal.png",
            ("xfce4-desktop", "/backdrop/screen0/monitoreDP-1/workspace2/last-image"): "/old/second.png",
            ("xfce4-desktop", "/backdrop/screen0/monitorHDMI-1/workspace0/last-image"): "/old/external.png",
            ("xfce4-desktop", "/desktop-menu/show"): "true",
        }
        self.writes = []
        self.calls = []
        self.fail_property = None
        self.on_write = None

    @staticmethod
    def output(value):
        if isinstance(value, list):
            return f"Value is an array with {len(value)} items:\n\n" + "\n".join(map(str, value)) + "\n"
        return str(value) + "\n"

    def run(self, argv, **kwargs):
        # Every desktop operation must stay in the user's session, with no shell,
        # elevation, channel reset, or unrestricted subprocess command string.
        assert isinstance(argv, list), argv
        assert argv[0] == "xfconf-query", argv
        assert not kwargs.get("shell", False), kwargs
        assert kwargs.get("env", {}).get("LC_ALL") == "C", kwargs
        assert not {"-r", "--reset", "-R", "--recursive"}.intersection(argv), argv
        self.calls.append((argv, kwargs))
        if "-c" not in argv:
            return subprocess.CompletedProcess(argv, 0, "Channels:\n  xfce4-panel\n  xfce4-desktop\n", "")
        channel = argv[argv.index("-c") + 1]
        if "-l" in argv:
            properties = sorted(prop for owner, prop in self.state if owner == channel)
            return subprocess.CompletedProcess(argv, 0, "\n".join(properties), "")
        prop = argv[argv.index("-p") + 1]
        if "-s" in argv:
            if self.on_write:
                self.on_write()
            if prop == self.fail_property:
                return subprocess.CompletedProcess(argv, 1, "", f"Setting {prop} is locked")
            values = [argv[i + 1] for i, arg in enumerate(argv) if arg == "-s"]
            kinds = [argv[i + 1] for i, arg in enumerate(argv) if arg == "-t"]
            assert len(kinds) == len(values), argv
            assert "-n" in argv, argv
            self.writes.append((channel, prop, kinds, values))
            self.state[channel, prop] = values if "-a" in argv or len(values) > 1 else values[0]
            return subprocess.CompletedProcess(argv, 0, "", "")
        if (channel, prop) not in self.state:
            return subprocess.CompletedProcess(argv, 1, "", "Property does not exist")
        return subprocess.CompletedProcess(argv, 0, self.output(self.state[channel, prop]), "")


class DesktopSettingsTests(unittest.TestCase):
    def test_default_taskbar_is_top_aligned_and_auto_hides(self):
        self.assertEqual(core.DEFAULTS["panel_position"], "top")
        self.assertEqual(core.DEFAULTS["panel_autohide"], "always")

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="conake-settings-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.environment = mock.patch.dict(os.environ, {
            "XDG_CONFIG_HOME": str(self.directory / "config"),
            "XDG_DATA_HOME": str(self.directory / "data"),
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.image = self.directory / "my anime art;$(touch marker).png"
        Image.new("RGB", (3, 2), "#abc123").save(self.image)
        self.preferences = {**core.DEFAULTS, "wallpaper": str(self.image), "panel_id": 9}
        self.xfconf = FakeXfconf()
        runner = mock.patch.object(core.subprocess, "run", side_effect=self.xfconf.run)
        self.run = runner.start()
        self.addCleanup(runner.stop)

    @property
    def saved_path(self):
        return core.config_dir() / "settings.json"

    def test_imported_wallpaper_survives_source_deletion_and_can_be_applied(self):
        expected = self.image.read_bytes()
        imported = Path(core.import_wallpaper(self.image))
        self.assertTrue(imported.is_relative_to(core.wallpaper_dir()))
        self.assertEqual(imported.read_bytes(), expected)
        self.assertEqual(Path(core.import_wallpaper(self.image)), imported)
        self.image.unlink()
        self.assertIn(str(imported), [path for _, path in core.list_wallpapers()])
        core.apply_settings({**self.preferences, "wallpaper": str(imported)})
        self.assertEqual(json.loads(self.saved_path.read_text())["wallpaper"], str(imported))
        self.assertEqual(imported.read_bytes(), expected)

    def test_invalid_image_does_not_get_imported_or_touch_desktop(self):
        bad = self.directory / "bad.png"
        bad.write_text("not a PNG")
        with self.assertRaises(core.SettingsError):
            core.import_wallpaper(bad)
        with self.assertRaises(core.SettingsError):
            core.apply_settings({**self.preferences, "wallpaper": str(bad)})
        self.assertFalse(core.wallpaper_dir().exists())
        self.run.assert_not_called()

    def test_svg_entity_documents_are_rejected_before_import(self):
        bad = self.directory / "external.svg"
        bad.write_text('<!DOCTYPE svg [<!ENTITY a SYSTEM "file:///etc/passwd">]>'
                       '<svg xmlns="http://www.w3.org/2000/svg"><text>&a;</text></svg>')
        with self.assertRaises(core.SettingsError):
            core.import_wallpaper(bad)
        self.assertFalse(core.wallpaper_dir().exists())

    def test_oversized_wallpaper_is_rejected(self):
        with self.image.open("r+b") as stream:
            stream.truncate(core.MAX_IMAGE_BYTES + 1)
        with self.assertRaisesRegex(core.SettingsError, "25 MB"):
            core.import_wallpaper(self.image)

    def test_malformed_preferences_fall_back_and_preserve_valid_individual_choices(self):
        self.saved_path.parent.mkdir(parents=True)
        for contents in ("{broken", "null", "[]", '"text"'):
            with self.subTest(contents=contents):
                self.saved_path.write_text(contents)
                self.assertEqual(core.load_preferences(), core.DEFAULTS)
        self.saved_path.write_text(json.dumps({
            "theme": "moonlit", "panel_size": "large", "panel_length": 83,
            "dark_mode": "yes", "font_size": 200, "unknown": "ignored",
        }))
        loaded = core.load_preferences()
        self.assertEqual(loaded["theme"], "moonlit")
        self.assertEqual(loaded["panel_length"], 83)
        self.assertEqual(loaded["panel_size"], core.DEFAULTS["panel_size"])
        self.assertEqual(loaded["dark_mode"], core.DEFAULTS["dark_mode"])
        self.assertEqual(loaded["font_size"], core.DEFAULTS["font_size"])
        self.assertNotIn("unknown", loaded)

    def test_invalid_preferences_are_rejected_before_desktop_writes(self):
        invalid = {
            "theme": "missing", "wallpaper_style": "run-command", "panel_position": "floating",
            "panel_autohide": "sometimes", "panel_id": -1, "panel_size": True,
            "panel_length": 101, "panel_opacity": 0, "font_size": "12", "workspaces": 0,
            "panel_color": "red; reboot", "taskbar_labels": "false", "dark_mode": 1,
            "compositing": None, "desktop_icons": [], "clock_24h": 0,
            "welcome_on_login": "yes", "wallpaper": "",
        }
        for key, value in invalid.items():
            with self.subTest(key=key):
                with self.assertRaises(core.SettingsError):
                    core.apply_settings({**self.preferences, key: value})
        self.run.assert_not_called()
        self.assertFalse(self.saved_path.exists())

    def test_apply_targets_all_discovered_connectors_and_workspaces(self):
        core.apply_settings(self.preferences)
        wallpaper_writes = {prop for channel, prop, _, _ in self.xfconf.writes
                            if channel == "xfce4-desktop" and prop.endswith("/last-image")}
        self.assertEqual(wallpaper_writes, {
            "/backdrop/screen0/monitoreDP-1/workspace0/last-image",
            "/backdrop/screen0/monitoreDP-1/workspace2/last-image",
            "/backdrop/screen0/monitorHDMI-1/workspace0/last-image",
        })
        for prop in wallpaper_writes:
            self.assertEqual(self.xfconf.state["xfce4-desktop", prop], str(self.image))
        self.assertEqual(self.xfconf.state["xfce4-desktop", "/desktop-menu/show"], "true")

    def test_single_workspace_mode_updates_workspace_zero_for_each_connector(self):
        del self.xfconf.state["xfce4-desktop", "/backdrop/screen0/monitorHDMI-1/workspace0/last-image"]
        self.xfconf.state["xfce4-desktop", "/backdrop/screen0/monitorHDMI-1/workspace1/last-image"] = "/old/other.png"
        core.apply_settings(self.preferences)
        self.assertEqual(self.xfconf.state["xfce4-desktop", "/backdrop/single-workspace-number"], "0")
        self.assertEqual(self.xfconf.state.get(("xfce4-desktop", "/backdrop/screen0/monitorHDMI-1/workspace0/last-image")),
                         str(self.image))

    def test_only_selected_panel_and_its_tasklist_and_clock_are_modified(self):
        before = dict(self.xfconf.state)
        core.apply_settings({**self.preferences, "taskbar_labels": False, "clock_24h": False})
        for channel, prop, _, _ in self.xfconf.writes:
            if channel == "xfce4-panel":
                self.assertTrue(prop == "/panels/dark-mode" or prop.startswith((
                    "/panels/panel-9/", "/plugins/plugin-90/", "/plugins/plugin-91/")), prop)
        for key in before:
            if key[1].startswith(("/panels/panel-2/", "/plugins/plugin-20", "/plugins/plugin-21", "/plugins/plugin-92")):
                self.assertEqual(self.xfconf.state[key], before[key])
        self.assertEqual(self.xfconf.state["xfce4-panel", "/plugins/plugin-90/show-labels"], "false")
        self.assertEqual(self.xfconf.state["xfce4-panel", "/plugins/plugin-91/digital-time-format"], "%I:%M %p")
        self.assertNotIn(("xfce4-panel", "/plugins/plugin-91/digital-format"), self.xfconf.state)

    def test_panel_length_rgba_clock_and_workspaces_use_xfce420_types(self):
        core.apply_settings({**self.preferences, "panel_color": "#4080ff", "panel_opacity": 65,
                             "panel_length": 83, "panel_position": "right"})
        writes = {(channel, prop): (kinds, values) for channel, prop, kinds, values in self.xfconf.writes}
        panel = "/panels/panel-9"
        self.assertEqual(writes["xfce4-panel", panel + "/length"], (["double"], ["83"]))
        kinds, values = writes["xfce4-panel", panel + "/background-rgba"]
        self.assertEqual(kinds, ["double"] * 4)
        self.assertEqual([float(value) for value in values], [64 / 255, 128 / 255, 1.0, 0.65])
        rgba_command = next(argv for argv, _ in self.xfconf.calls if "-s" in argv and panel + "/background-rgba" in argv)
        self.assertIn("-a", rgba_command)
        self.assertEqual(writes["xfce4-panel", panel + "/position"], (["string"], ["p=3;x=2500;y=1000"]))
        self.assertEqual(writes["xfce4-panel", panel + "/mode"], (["uint"], ["1"]))
        self.assertEqual(writes["xfce4-panel", "/plugins/plugin-91/mode"], (["uint"], ["2"]))
        self.assertEqual(writes["xfce4-panel", "/plugins/plugin-91/digital-layout"], (["uint"], ["3"]))
        self.assertEqual(writes["xfwm4", "/general/workspace_count"], (["int"], ["4"]))

    def test_array_headers_do_not_become_ids_and_rgba_reads_back(self):
        self.xfconf.state["xfce4-panel", "/panels/panel-9/background-rgba"] = ["0.250980", "0.501961", "1.000000", "0.650000"]
        self.xfconf.state["xfce4-panel", "/panels/panel-9/length"] = "83.000000"
        self.assertEqual(core.available_panels(), [2, 9])
        loaded = core.load_panel_settings(9, self.preferences)
        self.assertEqual(loaded["panel_color"], "#4080ff")
        self.assertEqual(loaded["panel_opacity"], 65)
        self.assertEqual(loaded["panel_length"], 83)

    def test_existing_right_edge_position_is_read_as_right(self):
        self.xfconf.state["xfce4-panel", "/panels/panel-9/position"] = "p=1;x=2500;y=1000"
        self.assertEqual(core.load_panel_settings(9, self.preferences)["panel_position"], "right")

    def test_preferences_are_persisted_only_after_successful_live_updates(self):
        self.saved_path.parent.mkdir(parents=True)
        previous = b'{"theme": "minimal"}\n'
        self.saved_path.write_bytes(previous)
        self.xfconf.on_write = lambda: self.assertEqual(self.saved_path.read_bytes(), previous)
        core.apply_settings({**self.preferences, "welcome_on_login": False})
        self.assertGreater(len(self.xfconf.writes), 10)
        self.assertEqual(json.loads(self.saved_path.read_text())["panel_id"], 9)
        self.assertIn("Hidden=true", (self.saved_path.parent.parent / "autostart/conake-welcome.desktop").read_text())

    def test_partial_failure_is_reported_and_saved_preferences_are_preserved(self):
        self.saved_path.parent.mkdir(parents=True)
        previous = b'{"theme": "minimal"}\n'
        self.saved_path.write_bytes(previous)
        self.xfconf.fail_property = "/panels/panel-9/background-rgba"
        with self.assertRaisesRegex(core.SettingsError, "locked"):
            core.apply_settings(self.preferences)
        self.assertGreater(len(self.xfconf.writes), 0)
        self.assertEqual(self.saved_path.read_bytes(), previous)
        self.assertFalse((self.saved_path.parent.parent / "autostart/conake-welcome.desktop").exists())

    def test_missing_panel_is_rejected_before_writes(self):
        with self.assertRaisesRegex(core.SettingsError, "taskbar no longer exists"):
            core.apply_settings({**self.preferences, "panel_id": 77})
        self.assertEqual(self.xfconf.writes, [])
        self.assertFalse(self.saved_path.exists())

    def test_missing_desktop_is_rejected_before_writes(self):
        self.xfconf.state = {key: value for key, value in self.xfconf.state.items() if key[0] != "xfce4-desktop"}
        with self.assertRaisesRegex(core.SettingsError, "desktop is not ready"):
            core.apply_settings(self.preferences)
        self.assertEqual(self.xfconf.writes, [])
        self.assertFalse(self.saved_path.exists())

    def test_missing_session_or_xfconf_is_reported_without_saving(self):
        for failure in (FileNotFoundError(), subprocess.TimeoutExpired("xfconf-query", 8)):
            with self.subTest(failure=type(failure).__name__):
                self.run.side_effect = failure
                with self.assertRaises(core.SettingsError):
                    core.apply_settings(self.preferences)
                self.assertFalse(self.saved_path.exists())
        self.run.side_effect = lambda argv, **kwargs: subprocess.CompletedProcess(argv, 1, "", "Cannot connect to session bus")
        with self.assertRaisesRegex(core.SettingsError, "session bus"):
            core.apply_settings(self.preferences)
        self.assertFalse(self.saved_path.exists())

    def test_settings_shortcuts_use_fixed_commands_without_a_shell_or_elevation(self):
        with mock.patch.object(core.shutil, "which", return_value="/usr/bin/xfce4-panel"), \
                mock.patch.object(core.subprocess, "Popen") as spawn:
            core.open_settings("panel")
            spawn.assert_called_once_with(["xfce4-panel", "--preferences"], start_new_session=True)
            with self.assertRaises(core.SettingsError):
                core.open_settings("panel; sudo reboot")
            self.assertEqual(spawn.call_count, 1)


if __name__ == "__main__":
    unittest.main()
