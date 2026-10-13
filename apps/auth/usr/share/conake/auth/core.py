"""Google OAuth2 authentication core logic."""

import json
import os
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import parse_qs, urlparse

import requests
from oauthlib.oauth2 import WebApplicationClient
from requests_oauthlib import OAuth2Session


class AuthError(Exception):
    """Authentication error with user-friendly message."""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SCOPES = ["openid", "email", "profile"]


def _config_dir():
    """Get user config directory for auth data."""
    base = os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")
    auth_dir = Path(base) / "conake" / "auth"
    auth_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    return auth_dir


def _credentials_path():
    """Path to stored OAuth credentials."""
    return _config_dir() / "google_credentials.json"


def _client_config_path():
    """Path to OAuth client configuration."""
    return _config_dir() / "client_config.json"


def get_client_config():
    """Load or create OAuth client configuration."""
    path = _client_config_path()
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def save_client_config(config):
    """Save OAuth client configuration."""
    path = _client_config_path()
    with open(path, "w") as f:
        json.dump(config, f)
    path.chmod(0o600)


def load_credentials():
    """Load stored OAuth credentials."""
    path = _credentials_path()
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def save_credentials(credentials):
    """Save OAuth credentials."""
    path = _credentials_path()
    with open(path, "w") as f:
        json.dump(credentials, f)
    path.chmod(0o600)


def clear_credentials():
    """Remove stored credentials."""
    path = _credentials_path()
    if path.exists():
        path.unlink()


def is_authenticated():
    """Check if user has valid credentials."""
    creds = load_credentials()
    if not creds:
        return False
    if creds.get("expires_at", 0) < time.time():
        return False
    return True


def get_user_info():
    """Get current user info from stored credentials."""
    creds = load_credentials()
    if not creds:
        return None
    return creds.get("user_info")


class GoogleAuth:
    """Handle Google OAuth2 flow."""

    def __init__(self, client_id=None, client_secret=None, redirect_uri=None):
        """Initialize with client config or load from storage."""
        config = get_client_config()
        self.client_id = client_id or (config and config.get("client_id"))
        self.client_secret = client_secret or (config and config.get("client_secret"))
        self.redirect_uri = redirect_uri or (config and config.get("redirect_uri", "http://localhost:8080/callback"))
        if not self.client_id or not self.client_secret:
            raise AuthError(
                "Google OAuth2 client not configured. Please set up client credentials in Conake Studio.",
                "Missing client_id or client_secret"
            )
        self.client = WebApplicationClient(self.client_id)
        self._session = None
        self._callback_received = threading.Event()
        self._callback_url = None
        self._callback_error = None

    def get_authorization_url(self):
        """Generate authorization URL for user consent."""
        uri, _, _ = self.client.prepare_authorization_request(
            GOOGLE_AUTH_URL,
            redirect_url=self.redirect_uri,
            scope=SCOPES,
            access_type="offline",
            prompt="consent"
        )
        return uri

    def _start_callback_server(self):
        """Start local HTTP server to receive OAuth callback."""
        from http.server import HTTPServer, BaseHTTPRequestHandler

        class CallbackHandler(BaseHTTPRequestHandler):
            def do_GET(handler_self):
                handler_self.send_response(200)
                handler_self.send_header("Content-type", "text/html")
                handler_self.end_headers()
                handler_self.wfile.write(b"""
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Authentication Complete</h1>
                <p>You may now close this window and return to Conake Studio.</p>
                </body></html>
                """)
                parsed = urlparse(handler_self.path)
                if parsed.path == "/callback":
                    self._callback_url = handler_self.path
                elif parsed.path == "/error":
                    self._callback_error = parse_qs(parsed.query).get("error", ["unknown"])[0]
                self._callback_received.set()

            def log_message(handler_self, format, *args):
                pass

        self._callback_received.clear()
        self._callback_url = None
        self._callback_error = None
        server = HTTPServer(("localhost", 8080), CallbackHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server

    def authenticate(self, timeout=300):
        """Run full OAuth2 flow and return user info."""
        if is_authenticated():
            creds = load_credentials()
            return creds.get("user_info")

        server = self._start_callback_server()
        try:
            auth_url = self.get_authorization_url()
            try:
                subprocess.run(["xdg-open", auth_url], check=False)
            except (FileNotFoundError, subprocess.CalledProcessError):
                raise AuthError(
                    "Could not open browser for authentication. Please open this URL manually:",
                    auth_url
                )

            if not self._callback_received.wait(timeout=timeout):
                raise AuthError("Authentication timed out. Please try again.")

            if self._callback_error:
                raise AuthError(f"Authentication failed: {self._callback_error}")

            if not self._callback_url:
                raise AuthError("No callback received")

            token = self.client.parse_request_uri_response(self.redirect_uri + self._callback_url)
            self.client.parse_request_body_response(json.dumps(token))

            credentials = {
                "token": token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "expires_at": time.time() + token.get("expires_in", 3600),
                "user_info": self._fetch_user_info()
            }
            save_credentials(credentials)
            return credentials["user_info"]

        finally:
            server.shutdown()

    def _fetch_user_info(self):
        """Fetch user info from Google."""
        self._session = OAuth2Session(
            self.client_id,
            token=self.client.token,
            auto_refresh_url=GOOGLE_TOKEN_URL,
            auto_refresh_kwargs={
                "client_id": self.client_id,
                "client_secret": self.client_secret
            },
            token_updater=save_credentials
        )
        resp = self._session.get(GOOGLE_USERINFO_URL)
        resp.raise_for_status()
        return resp.json()

    def refresh_token(self):
        """Refresh access token if expired."""
        creds = load_credentials()
        if not creds:
            return False
        self.client.parse_request_body_response(json.dumps(creds["token"]))
        try:
            new_token = self.client.refresh_token(
                GOOGLE_TOKEN_URL,
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            creds["token"] = new_token
            creds["expires_at"] = time.time() + new_token.get("expires_in", 3600)
            save_credentials(creds)
            return True
        except Exception:
            return False

    def logout(self):
        """Clear stored credentials."""
        clear_credentials()