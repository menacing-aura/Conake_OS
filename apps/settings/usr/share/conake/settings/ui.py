"""Native, local personalization and focus controls for the Conake desktop."""
import math
from pathlib import Path
import queue
import threading
import time
import tkinter as tk
from tkinter import colorchooser, filedialog, messagebox, ttk

import core

try:
    from PIL import Image, ImageOps, ImageTk
except ImportError:
    Image = ImageOps = ImageTk = None


BG = "#11101c"
CARD = "#1d1b2c"
FIELD = "#29263b"
FG = "#f1eef9"
MUTED = "#ada6c4"
PINK = "#f2a7cf"
CYAN = "#8edbdc"


class Studio:
    def __init__(self, root):
        self.root = root
        self.root.title("Conake Studio")
        self.root.geometry("1000x720")
        self.root.minsize(780, 580)
        self.root.configure(background=BG)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.results = queue.Queue()
        self.applying = False
        self.poll_id = None
        self.preview_image = None
        self.wallpapers = []
        self.pages = {}
        self.timer_id = None
        self.timer_deadline = None
        self.timer_remaining = 25 * 60
        self.timer_duration = 25 * 60
        self.timer_running = False
        self.timer_minutes = tk.StringVar(value="25")
        self.timer_display = tk.StringVar(value="25:00")
        self.timer_status = tk.StringVar(value="One small step. One focused session.")
        self.status = tk.StringVar(value="Choose your look, then apply it to the desktop.")
        self._style()

        prefs = dict(core.DEFAULTS)
        warning = None
        try:
            prefs.update(core.load_preferences())
            prefs.update(core.read_current_settings(prefs))
        except (core.SettingsError, OSError, ValueError) as exc:
            warning = f"Some current settings could not be read: {exc}"
        self.vars = {}
        for key, value in prefs.items():
            var_type = tk.BooleanVar if isinstance(value, bool) else tk.StringVar
            self.vars[key] = var_type(value=value)

        header = tk.Frame(root, bg=BG, padx=30, pady=22)
        header.pack(fill="x")
        self.label(header, "C O N A K E   O S", color=CYAN, size=10, bold=True).pack(anchor="w")
        self.label(header, "Conake Studio", size=27, bold=True).pack(anchor="w", pady=(7, 3))
        self.label(header, "Make this desktop yours.", color=MUTED, size=12).pack(anchor="w")

        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill="both", expand=True, padx=24)
        self.wallpaper_page = self.page("Wallpapers")
        self.taskbar_page = self.page("Taskbar")
        self.desktop_page = self.page("Desktop")
        self.focus_page = self.page("Focus")
        self._wallpaper_tab()
        self._taskbar_tab()
        self._desktop_tab()
        self._focus_tab()

        footer = tk.Frame(root, bg=BG, padx=28, pady=18)
        footer.pack(fill="x")
        self.apply_button = ttk.Button(footer, text="Apply to desktop", style="Accent.TButton", command=self.apply)
        self.apply_button.pack(side="right", padx=(20, 0))
        self.status_label = self.label(footer, "", color=MUTED, size=10)
        self.status_label.configure(textvariable=self.status, wraplength=620)
        self.status_label.pack(side="left", fill="x", expand=True)
        footer.bind("<Configure>", lambda event: self.status_label.configure(wraplength=max(300, event.width - 240)))
        self.root.bind("<MouseWheel>", self._scroll)
        self.root.bind("<Button-4>", self._scroll)
        self.root.bind("<Button-5>", self._scroll)
        self.root.bind("<Control-Return>", lambda _event: self.apply())
        self._refresh_wallpapers()
        self._preview_wallpaper()
        self._preview_taskbar()
        if warning:
            self.status.set(warning)

    def _style(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure(".", font=("DejaVu Sans", 10), background=CARD, foreground=FG)
        style.configure("TNotebook", background=BG, borderwidth=0, tabmargins=(4, 0, 4, 0))
        style.configure("TNotebook.Tab", padding=(24, 12), background=BG, foreground=MUTED, borderwidth=0)
        style.map("TNotebook.Tab", background=[("selected", CARD)], foreground=[("selected", PINK)])
        style.configure("TButton", background=FIELD, foreground=FG, padding=(13, 9), borderwidth=0)
        style.map("TButton", background=[("active", "#39344d"), ("disabled", "#242132")], foreground=[("disabled", MUTED)])
        style.configure("Accent.TButton", background=PINK, foreground=BG, font=("DejaVu Sans", 10, "bold"))
        style.map("Accent.TButton", background=[("active", "#ffd0e7"), ("disabled", FIELD)], foreground=[("disabled", MUTED)])
        style.configure("TCheckbutton", background=CARD, foreground=FG, padding=(0, 6), indicatorbackground=FIELD)
        style.map("TCheckbutton", background=[("active", CARD)], indicatorbackground=[("selected", PINK)])
        style.configure("TCombobox", fieldbackground=FIELD, background=FIELD, foreground=FG, arrowcolor=PINK, padding=7)
        style.map("TCombobox", fieldbackground=[("readonly", FIELD)], foreground=[("readonly", FG)], selectbackground=[("readonly", FIELD)], selectforeground=[("readonly", FG)])
        style.configure("TSpinbox", fieldbackground=FIELD, background=FIELD, foreground=FG, arrowcolor=PINK, padding=7)
        style.configure("TEntry", fieldbackground=FIELD, foreground=FG, insertcolor=FG, padding=7)
        style.configure("Horizontal.TProgressbar", background=CYAN, troughcolor=FIELD, borderwidth=0)
        style.configure("Vertical.TScrollbar", background=FIELD, troughcolor=CARD, arrowcolor=MUTED, borderwidth=0)
        self.root.option_add("*TCombobox*Listbox.background", FIELD)
        self.root.option_add("*TCombobox*Listbox.foreground", FG)
        self.root.option_add("*TCombobox*Listbox.selectBackground", "#514462")
        self.root.option_add("*TCombobox*Listbox.selectForeground", FG)

    @staticmethod
    def label(parent, text, color=FG, size=10, bold=False):
        return tk.Label(parent, text=text, bg=parent.cget("background"), fg=color,
                        font=("DejaVu Sans", size, "bold" if bold else "normal"), justify="left", anchor="w")

    def page(self, title):
        outer = tk.Frame(self.notebook, bg=CARD)
        canvas = tk.Canvas(outer, bg=CARD, highlightthickness=0, borderwidth=0)
        scrollbar = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        content = tk.Frame(canvas, bg=CARD, padx=24, pady=20)
        window = canvas.create_window((0, 0), window=content, anchor="nw")
        content.bind("<Configure>", lambda _event: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda event: canvas.itemconfigure(window, width=event.width))
        self.notebook.add(outer, text=title)
        self.pages[str(outer)] = canvas
        return content

    def _scroll(self, event):
        # Keep wheel events in input controls from unexpectedly moving the page.
        if isinstance(event.widget, (ttk.Combobox, ttk.Spinbox, tk.Listbox)):
            return
        canvas = self.pages.get(self.notebook.select())
        if canvas and canvas.bbox("all") and canvas.bbox("all")[3] > canvas.winfo_height():
            direction = -1 if getattr(event, "num", 0) == 4 or getattr(event, "delta", 0) > 0 else 1
            canvas.yview_scroll(direction * 3, "units")

    def section(self, parent, title, subtitle=None):
        self.label(parent, title, size=15, bold=True).pack(anchor="w", pady=(0, 6))
        if subtitle:
            self.label(parent, subtitle, color=MUTED).pack(anchor="w", pady=(0, 16))

    def _wallpaper_tab(self):
        page = self.wallpaper_page
        self.section(page, "Your world, your wallpaper", "Start with an anime-inspired palette, or bring your own image.")
        presets = tk.Frame(page, bg=CARD)
        presets.pack(fill="x", pady=(0, 20))
        for index, (key, theme) in enumerate(core.THEMES.items()):
            presets.columnconfigure(index, weight=1)
            button = tk.Button(presets, text=theme["name"], command=lambda name=key: self.select_theme(name),
                               bg=theme["panel"], fg=theme["accent"], activebackground=FIELD,
                               activeforeground=FG, relief="flat", borderwidth=0, cursor="hand2",
                               padx=10, pady=15, font=("DejaVu Sans", 11, "bold"))
            button.grid(row=0, column=index, sticky="ew", padx=(0, 8 if index < len(core.THEMES) - 1 else 0))

        body = tk.Frame(page, bg=CARD)
        body.pack(fill="x")
        body.columnconfigure(0, weight=3)
        body.columnconfigure(1, weight=2)
        preview_frame = tk.Frame(body, bg=CARD)
        preview_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 20))
        self.wallpaper_canvas = tk.Canvas(preview_frame, height=230, background=BG, highlightthickness=0)
        self.wallpaper_canvas.pack(fill="x")
        self.wallpaper_canvas.bind("<Configure>", lambda _event: self._preview_wallpaper())
        self.wallpaper_name = self.label(preview_frame, "", size=10, bold=True)
        self.wallpaper_name.pack(anchor="w", pady=(10, 4))
        self.label(preview_frame, "Preview · changes take effect when you apply.", color=MUTED, size=9).pack(anchor="w")

        library = tk.Frame(body, bg=CARD)
        library.grid(row=0, column=1, sticky="nsew")
        self.label(library, "Wallpaper library", bold=True).pack(anchor="w", pady=(0, 8))
        list_frame = tk.Frame(library, bg=CARD)
        list_frame.pack(fill="both", expand=True)
        self.wallpaper_list = tk.Listbox(list_frame, height=8, bg=FIELD, fg=FG, selectbackground="#514462",
                                        selectforeground=FG, highlightthickness=0, borderwidth=0,
                                        font=("DejaVu Sans", 10), activestyle="none", exportselection=False)
        list_scroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.wallpaper_list.yview)
        self.wallpaper_list.configure(yscrollcommand=list_scroll.set)
        list_scroll.pack(side="right", fill="y")
        self.wallpaper_list.pack(side="left", fill="both", expand=True)
        self.wallpaper_list.bind("<<ListboxSelect>>", self.select_wallpaper)
        ttk.Button(library, text="Import your wallpaper…", command=self.import_wallpaper).pack(fill="x", pady=(12, 6))
        self.label(library, "PNG, JPG, WebP or SVG · stored locally", color=MUTED, size=9).pack(anchor="w")
        options = tk.Frame(page, bg=CARD)
        options.pack(fill="x", pady=(22, 0))
        self.label(options, "Image fit").pack(side="left", padx=(0, 12))
        self.combo(options, "wallpaper_style", ["zoom", "scaled", "stretch", "center", "tile"], width=16).pack(side="left")
        self.label(options, "Applies to all connected desktop backgrounds.", color=MUTED, size=9).pack(side="left", padx=16)

    def combo(self, parent, key, values, width=20):
        return ttk.Combobox(parent, textvariable=self.vars[key], values=values, state="readonly", width=width)

    def select_theme(self, key):
        theme = core.THEMES[key]
        for setting, value in (("theme", key), ("wallpaper", theme["wallpaper"]), ("panel_color", theme["panel"])):
            self.vars[setting].set(value)
        self._refresh_wallpapers()
        self._preview_wallpaper()
        self._preview_taskbar()
        self.status.set(f"{theme['name']} selected. You can still choose a different wallpaper or taskbar color.")

    def _refresh_wallpapers(self):
        try:
            self.wallpapers = core.list_wallpapers()
        except (OSError, core.SettingsError) as exc:
            self.wallpapers = []
            self.status.set(f"Wallpaper library could not be read: {exc}")
        selected = self.vars["wallpaper"].get()
        if selected and selected not in [path for _label, path in self.wallpapers]:
            self.wallpapers.append((Path(selected).stem, selected))
        self.wallpaper_list.delete(0, "end")
        for index, (label, path) in enumerate(self.wallpapers):
            self.wallpaper_list.insert("end", f"  {label}")
            if path == selected:
                self.wallpaper_list.selection_set(index)
                self.wallpaper_list.see(index)

    def select_wallpaper(self, _event=None):
        selected = self.wallpaper_list.curselection()
        if selected:
            self.vars["wallpaper"].set(self.wallpapers[selected[0]][1])
            self._preview_wallpaper()
            self.status.set("Wallpaper selected. Apply to update your desktop.")

    def import_wallpaper(self):
        filename = filedialog.askopenfilename(parent=self.root, title="Choose your wallpaper",
                                             filetypes=[("Wallpaper images", "*.png *.jpg *.jpeg *.webp *.svg"), ("All files", "*")])
        if not filename:
            return
        try:
            path = core.import_wallpaper(filename)
        except (core.SettingsError, OSError, ValueError) as exc:
            messagebox.showerror("Could not import wallpaper", str(exc), parent=self.root)
            return
        self.vars["wallpaper"].set(path)
        self._refresh_wallpapers()
        self._preview_wallpaper()
        self.status.set("Your wallpaper is in the library. Apply to use it on the desktop.")

    def _preview_wallpaper(self):
        if not hasattr(self, "wallpaper_canvas"):
            return
        canvas = self.wallpaper_canvas
        width, height = max(200, canvas.winfo_width()), 230
        canvas.delete("all")
        self.preview_image = None
        path = Path(self.vars["wallpaper"].get())
        name = next((label for label, candidate in self.wallpapers if candidate == str(path)), path.stem)
        self.wallpaper_name.configure(text=name[:55] or "Choose a wallpaper")
        if Image is not None and path.suffix.lower() != ".svg":
            try:
                with Image.open(path) as source:
                    thumb = ImageOps.contain(ImageOps.exif_transpose(source).convert("RGB"), (width, height))
                    self.preview_image = ImageTk.PhotoImage(thumb, master=self.root)
                canvas.create_image(width / 2, height / 2, image=self.preview_image)
                return
            except (OSError, ValueError, Image.DecompressionBombError):
                pass
        theme = next((value for value in core.THEMES.values() if value["wallpaper"] == str(path)), None)
        color = theme["panel"] if theme else FIELD
        accent = theme["accent"] if theme else CYAN
        canvas.create_rectangle(0, 0, width, height, fill=color, outline="")
        canvas.create_oval(width - 145, -45, width + 45, 145, fill=FIELD, outline=accent, width=1)
        canvas.create_line(24, height - 55, width - 24, height - 55, fill=accent, width=2)
        canvas.create_text(24, 88, text=name[:30] or "Your wallpaper", anchor="w", fill=FG, font=("DejaVu Sans", 17, "bold"), width=width - 48)
        description = "SVG wallpaper · preview card" if path.suffix.lower() == ".svg" else "Image preview unavailable"
        canvas.create_text(24, height - 30, text=description, anchor="w", fill=MUTED, font=("DejaVu Sans", 9))

    def _taskbar_tab(self):
        page = self.taskbar_page
        self.section(page, "A taskbar that feels like you", "Choose a panel, adjust its layout, then add your own color.")
        self.panel_canvas = tk.Canvas(page, height=96, bg=BG, highlightthickness=0)
        self.panel_canvas.pack(fill="x", pady=(0, 6))
        self.panel_canvas.bind("<Configure>", lambda _event: self._preview_taskbar())
        self.label(page, "Color preview · position and size are applied to the desktop.", color=MUTED, size=9).pack(anchor="w", pady=(0, 20))
        form = tk.Frame(page, bg=CARD)
        form.pack(fill="x")
        form.columnconfigure(1, weight=1)
        try:
            panels = core.available_panels()
        except (core.SettingsError, OSError, ValueError):
            panels = []
        current_panel = int(self.vars["panel_id"].get())
        if current_panel not in panels:
            panels.append(current_panel)
        self.form_row(form, 0, "Customize panel", self.combo(form, "panel_id", panels))
        form.grid_slaves(row=0, column=1)[0].bind("<<ComboboxSelected>>", self.select_panel)
        self.form_row(form, 1, "Position", self.combo(form, "panel_position", ["bottom", "top", "left", "right"]))
        self.form_row(form, 2, "Auto-hide", self.combo(form, "panel_autohide", ["never", "intelligent", "always"]))
        for row, (key, label, low, high, unit) in enumerate([
            ("panel_size", "Panel size", 24, 72, "px"),
            ("panel_length", "Panel length", 40, 100, "%"),
            ("panel_opacity", "Opacity", 40, 100, "%"),
        ], start=3):
            holder = tk.Frame(form, bg=CARD)
            ttk.Spinbox(holder, from_=low, to=high, textvariable=self.vars[key], width=8).pack(side="left")
            self.label(holder, f"{unit}   ({low}–{high})", color=MUTED).pack(side="left", padx=10)
            self.form_row(form, row, label, holder)
        color_row = tk.Frame(form, bg=CARD)
        self.color_button = tk.Button(color_row, text="Choose color…", command=self.choose_color, relief="flat", padx=15, pady=8,
                                      font=("DejaVu Sans", 10), fg=FG, bg=FIELD, activebackground=FIELD, activeforeground=FG)
        self.color_button.pack(side="left")
        self.color_label = self.label(color_row, "", color=MUTED)
        self.color_label.configure(textvariable=self.vars["panel_color"])
        self.color_label.pack(side="left", padx=12)
        self.form_row(form, 6, "Taskbar color", color_row)
        ttk.Checkbutton(page, text="Show names beside open app icons", variable=self.vars["taskbar_labels"]).pack(anchor="w", pady=(12, 0))
        self.vars["taskbar_labels"].trace_add("write", lambda *_args: self._preview_taskbar())
        self.label(page, "For launchers, panel plugins and extra panels, open the full panel editor.", color=MUTED, size=9).pack(anchor="w", pady=(12, 8))
        ttk.Button(page, text="Open panel editor", command=lambda: self.open_settings("panel")).pack(anchor="w")

    def form_row(self, parent, row, title, widget):
        self.label(parent, title).grid(row=row, column=0, sticky="w", padx=(0, 35), pady=5)
        widget.grid(row=row, column=1, sticky="w", pady=5)

    def select_panel(self, _event=None):
        try:
            prefs = core.load_panel_settings(int(self.vars["panel_id"].get()), self.collect_preferences())
            for key, value in prefs.items():
                if key in self.vars and (key.startswith("panel_") or key in ("taskbar_labels", "clock_24h")):
                    self.vars[key].set(value)
        except (core.SettingsError, OSError, ValueError) as exc:
            messagebox.showerror("Could not read panel", str(exc), parent=self.root)
            return
        self._preview_taskbar()
        self.status.set("Panel settings loaded. Adjust them and apply when ready.")

    def choose_color(self):
        _rgb, color = colorchooser.askcolor(color=self.vars["panel_color"].get(), parent=self.root, title="Choose your taskbar color")
        if color:
            self.vars["panel_color"].set(color)
            self._preview_taskbar()

    def _preview_taskbar(self):
        if not hasattr(self, "panel_canvas"):
            return
        canvas = self.panel_canvas
        canvas.delete("all")
        width = max(400, canvas.winfo_width())
        color = self.vars["panel_color"].get()
        try:
            self.root.winfo_rgb(color)
        except tk.TclError:
            color = FIELD
        self.color_button.configure(bg=color)
        canvas.create_rectangle(18, 24, width - 18, 73, fill=color, outline="")
        canvas.create_text(40, 48, text="✦", fill=PINK, font=("DejaVu Sans", 20), anchor="w")
        canvas.create_line(78, 36, 78, 61, fill=MUTED)
        text = "◈  Files       ◎  Browser       ✧  Studio" if self.vars["taskbar_labels"].get() else "◈        ◎        ✧"
        canvas.create_text(98, 49, text=text, fill=FG, font=("DejaVu Sans", 10), anchor="w")
        canvas.create_text(width - 38, 49, text="♪   12:42", fill=CYAN, font=("DejaVu Sans", 10), anchor="e")

    def _desktop_tab(self):
        page = self.desktop_page
        self.section(page, "Little details, better days", "Keep your space comfortable, readable and as quiet as you like.")
        for key, title in [
            ("dark_mode", "Use dark application appearance"),
            ("compositing", "Enable desktop compositing and transparency"),
            ("desktop_icons", "Show desktop icons"),
            ("clock_24h", "Use a 24-hour clock on the selected panel"),
            ("welcome_on_login", "Show the welcome screen when I sign in"),
        ]:
            ttk.Checkbutton(page, text=title, variable=self.vars[key]).pack(anchor="w", pady=2)
        self.label(page, "Turning off compositing can help on older hardware.", color=MUTED, size=9).pack(anchor="w", pady=(6, 18))
        form = tk.Frame(page, bg=CARD)
        form.pack(fill="x")
        self.form_row(form, 0, "Interface font size", ttk.Spinbox(form, from_=9, to=16, textvariable=self.vars["font_size"], width=8))
        self.form_row(form, 1, "Workspaces", ttk.Spinbox(form, from_=1, to=8, textvariable=self.vars["workspaces"], width=8))
        self.label(page, "A workspace for creating, one for studying, one for everything else.", color=MUTED, size=9).pack(anchor="w", pady=(8, 22))
        self.section(page, "More desktop settings")
        shortcuts = tk.Frame(page, bg=CARD)
        shortcuts.pack(fill="x")
        for index, (key, name) in enumerate([
            ("appearance", "Appearance"), ("display", "Displays"), ("keyboard", "Keyboard"),
            ("mouse", "Mouse & touchpad"), ("power", "Power"), ("notifications", "Notifications"),
        ]):
            shortcuts.columnconfigure(index % 3, weight=1)
            ttk.Button(shortcuts, text=name, command=lambda target=key: self.open_settings(target)).grid(
                row=index // 3, column=index % 3, sticky="ew", padx=(0, 10), pady=5)

    def open_settings(self, name):
        try:
            core.open_settings(name)
        except (core.SettingsError, OSError) as exc:
            messagebox.showerror("Could not open settings", str(exc), parent=self.root)

    def _focus_tab(self):
        page = self.focus_page
        self.section(page, "Your next chapter starts here", "A small focus timer for studying, making things, or taking a real break.")
        timer_box = tk.Frame(page, bg=BG, padx=24, pady=25)
        timer_box.pack(fill="x", pady=(8, 20))
        timer_label = self.label(timer_box, "", color=CYAN, size=56, bold=True)
        timer_label.configure(textvariable=self.timer_display, anchor="center")
        timer_label.pack(fill="x")
        timer_caption = self.label(timer_box, "", color=MUTED)
        timer_caption.configure(textvariable=self.timer_status, anchor="center")
        timer_caption.pack(fill="x", pady=(2, 20))
        self.timer_progress = ttk.Progressbar(timer_box, orient="horizontal", maximum=100)
        self.timer_progress.pack(fill="x")
        presets = tk.Frame(page, bg=CARD)
        presets.pack(anchor="center", pady=(0, 16))
        for minutes, label in ((25, "Focus · 25 min"), (5, "Breathe · 5 min"), (50, "Deep work · 50 min")):
            ttk.Button(presets, text=label, command=lambda value=minutes: self.set_timer(value)).pack(side="left", padx=5)
        controls = tk.Frame(page, bg=CARD)
        controls.pack(anchor="center", pady=(0, 14))
        self.label(controls, "Custom minutes").pack(side="left", padx=(0, 10))
        ttk.Spinbox(controls, from_=1, to=180, textvariable=self.timer_minutes, width=6).pack(side="left")
        ttk.Button(controls, text="Set", command=self.set_custom_timer).pack(side="left", padx=(10, 0))
        actions = tk.Frame(page, bg=CARD)
        actions.pack(anchor="center", pady=5)
        self.timer_button = ttk.Button(actions, text="Start session", style="Accent.TButton", command=self.toggle_timer)
        self.timer_button.pack(side="left", padx=5)
        ttk.Button(actions, text="Reset", command=self.reset_timer).pack(side="left", padx=5)
        self.label(page, "Keep Studio open for the timer. A bell marks the end of each session.", color=MUTED, size=9).pack(anchor="center", pady=(20, 0))

    def set_custom_timer(self):
        try:
            minutes = int(self.timer_minutes.get())
            if not 1 <= minutes <= 180:
                raise ValueError
        except ValueError:
            messagebox.showerror("Choose a duration", "Enter a whole number from 1 to 180 minutes.", parent=self.root)
            return
        self.set_timer(minutes)

    def set_timer(self, minutes):
        self._cancel_timer_tick()
        self.timer_minutes.set(str(minutes))
        self.timer_duration = minutes * 60
        self.timer_remaining = self.timer_duration
        self.timer_deadline = None
        self.timer_running = False
        self.timer_status.set("Ready when you are.")
        self.timer_button.configure(text="Start session")
        self._render_timer()

    def reset_timer(self):
        self.set_timer(self.timer_duration // 60)

    def toggle_timer(self):
        if self.timer_running:
            self.timer_remaining = max(0, self.timer_deadline - time.monotonic())
            self.timer_running = False
            self._cancel_timer_tick()
            self.timer_button.configure(text="Resume session")
            self.timer_status.set("Paused. Take your time.")
            self._render_timer()
            return
        if self.timer_remaining <= 0:
            self.timer_remaining = self.timer_duration
        self.timer_running = True
        self.timer_deadline = time.monotonic() + self.timer_remaining
        self.timer_button.configure(text="Pause")
        self.timer_status.set("One thing at a time. You have this.")
        self._tick_timer()

    def _render_timer(self):
        seconds = max(0, math.ceil(self.timer_remaining))
        self.timer_display.set(f"{seconds // 60:02d}:{seconds % 60:02d}")
        self.timer_progress["value"] = 100 * (1 - self.timer_remaining / self.timer_duration)

    def _tick_timer(self):
        self.timer_id = None
        self.timer_remaining = max(0, self.timer_deadline - time.monotonic())
        self._render_timer()
        if self.timer_remaining <= 0:
            self.timer_running = False
            self.timer_button.configure(text="Start again")
            self.timer_status.set("Session complete. Stretch, breathe, and enjoy the small win.")
            self.status.set("Focus session complete.")
            self.root.bell()
            return
        self.timer_id = self.root.after(200, self._tick_timer)

    def _cancel_timer_tick(self):
        if self.timer_id is not None:
            self.root.after_cancel(self.timer_id)
            self.timer_id = None

    def collect_preferences(self):
        prefs = {key: variable.get() for key, variable in self.vars.items()}
        for key, default in core.DEFAULTS.items():
            if isinstance(default, int) and not isinstance(default, bool):
                try:
                    prefs[key] = int(prefs[key])
                except (TypeError, ValueError):
                    raise ValueError(f"{key.replace('_', ' ').capitalize()} must be a whole number.") from None
        return prefs

    def apply(self):
        if self.applying:
            return
        try:
            prefs = self.collect_preferences()
        except (ValueError, tk.TclError) as exc:
            messagebox.showerror("Check your settings", str(exc), parent=self.root)
            return
        self.applying = True
        self.applied_preferences = prefs
        self.apply_button.configure(state="disabled")
        self.status.set("Applying your desktop settings…")

        def worker():
            try:
                core.apply_settings(prefs)
            except Exception as exc:
                self.results.put((False, str(exc)))
            else:
                self.results.put((True, None))

        threading.Thread(target=worker, name="conake-settings-apply", daemon=True).start()
        self.poll_id = self.root.after(100, self._poll_apply)

    def _poll_apply(self):
        self.poll_id = None
        try:
            success, error = self.results.get_nowait()
        except queue.Empty:
            self.poll_id = self.root.after(100, self._poll_apply)
            return
        self.applying = False
        self.apply_button.configure(state="normal")
        if success:
            try:
                pending = self.collect_preferences() != self.applied_preferences
            except (ValueError, tk.TclError):
                pending = True
            self.status.set("Settings applied. Your newer choices are still pending; apply again when ready." if pending
                            else "Settings applied and saved. Your desktop, your way.")
        else:
            self.status.set("Settings could not be fully applied. Review the error and try again.")
            messagebox.showerror("Could not finish applying settings",
                                 f"{error}\n\nSome desktop settings may already have changed. Adjust your choices and try again.", parent=self.root)

    def close(self):
        if self.applying:
            self.status.set("Please wait for the current settings change to finish before closing Studio.")
            return
        self._cancel_timer_tick()
        if self.poll_id is not None:
            self.root.after_cancel(self.poll_id)
        self.root.destroy()


def main():
    root = tk.Tk()
    Studio(root)
    root.mainloop()


if __name__ == "__main__":
    main()
