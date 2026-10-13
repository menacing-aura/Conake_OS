"""Google Authentication UI for Conake Studio."""

from .core import GoogleAuth, AuthError, is_authenticated, get_user_info, save_credentials

import tkinter as tk
from tkinter import messagebox
import threading


class AuthWindow:
    """Window for Google OAuth2 authentication."""

    def __init__(self, root):
        self.root = root
        self.root.title("Conake - Google Sign In")
        self.root.geometry("500x400")
        self.root.minsize(450, 350)
        self.root.configure(background="#11101c")
        self.result = None
        self.auth = None
        self.callback_server = None

        # UI setup
        self._setup_ui()

        # Try to authenticate if already has credentials
        self._check_existing_creds()

    def _setup_ui(self):
        """Set up the authentication UI."""
        content = tk.Frame(self.root, background="#11101c", padx=40, pady=30)
        content.pack(fill="both", expand=True)

        # Title
        tk.Label(
            content,
            text="Conake OS",
            font=("Sans", 24, "bold"),
            foreground="#8edbdc",
            background="#11101c"
        ).pack(anchor="w", pady=(0, 10))

        tk.Label(
            content,
            text="Sign in with Google",
            font=("Sans", 16, "bold"),
            foreground="#f1eef9",
            background="#11101c"
        ).pack(anchor="w", pady=(0, 20))

        # Status
        self.status_var = tk.StringVar(value="Checking credentials...")
        tk.Label(
            content,
            textvariable=self.status_var,
            font=("Sans", 10),
            foreground="#ada6c4",
            background="#11101c"
        ).pack(anchor="w", pady=(0, 20))

        # Buttons frame
        buttons = tk.Frame(content, background="#11101c")
        buttons.pack(fill="x", pady=20)

        self.sign_in_btn = tk.Button(
            buttons,
            text="Sign in with Google",
            font=("Sans", 12, "bold"),
            foreground="#11101c",
            background="#f2a7cf",
            activebackground="#efd5f2",
            relief="flat",
            padx=30,
            pady=10,
            command=self._start_auth_flow
        )
        self.sign_in_btn.pack(side="left", padx=(0, 12))

        self.cancel_btn = tk.Button(
            buttons,
            text="Cancel",
            font=("Sans", 12, "bold"),
            foreground="#b5adc9",
            background="#11101c",
            activebackground="#29263b",
            activeforeground="#f1eef9",
            relief="flat",
            padx=30,
            pady=10,
            command=self.root.destroy
        )
        self.cancel_btn.pack(side="left")

    def _check_existing_creds(self):
        """Check if user already has valid credentials."""
        try:
            if is_authenticated():
                user_info = get_user_info()
                if user_info:
                    self.result = user_info
                    self.root.destroy()
                    return
            self.status_var.set("No saved credentials. Starting sign in flow...")
        except Exception as e:
            self.status_var.set(f"Error checking credentials: {str(e)}")

    def _start_auth_flow(self):
        """Start the Google OAuth2 authentication flow."""
        self.sign_in_btn.configure(state="disabled", text="Signing in...")
        self.status_var.set("Opening browser...")

        def run_auth():
            try:
                self.auth = GoogleAuth()
                user_info = self.auth.authenticate(timeout=300)
                self.result = user_info
                self.root.after(0, self._auth_success)
            except AuthError as e:
                self.root.after(0, lambda: self._auth_error(str(e)))
            except Exception as e:
                self.root.after(0, lambda: self._auth_error(str(e)))

        threading.Thread(target=run_auth, daemon=True).start()

    def _auth_success(self):
        """Handle successful authentication."""
        self.status_var.set("Authentication successful!")
        self.sign_in_btn.configure(state="normal", text="Sign in with Google")
        # Save credentials and close
        try:
            save_credentials(self.result)
            self.result = {"status": "success"}
            self.root.destroy()
        except Exception as e:
            self._auth_error(f"Failed to save credentials: {str(e)}")

    def _auth_error(self, error_msg):
        """Handle authentication error."""
        self.sign_in_btn.configure(state="normal", text="Sign in with Google")
        self.status_var.set("Authentication failed")
        messagebox.showerror(
            "Authentication Error",
            f"Google sign in failed:\n{error_msg}\n\n"
            "Please check your internet connection and try again.",
            parent=self.root
        )

    def show(self):
        """Show the auth window."""
        self.root.mainloop()
        return self.result