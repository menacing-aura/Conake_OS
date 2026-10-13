"""Optional Google account linking for applications; never an OS login provider."""

import base64
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import threading
import time
from urllib.parse import parse_qs, urlsplit

from oauthlib.oauth2 import OAuth2Error
import requests
from requests_oauthlib import OAuth2Session


class AuthError(Exception):
    """An actionable error that does not expose credentials or provider responses."""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SCOPES = ["openid", "email", "profile"]
DEFAULT_REDIRECT_URI = "http://127.0.0.1:8080/callback"
REQUEST_TIMEOUT = 15


def _config_dir():
    directory = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "conake/auth"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    return directory


def _read_json(name):
    try:
        value = json.loads((_config_dir() / name).read_text())
        return value if isinstance(value, dict) else None
    except (FileNotFoundError, ValueError):
        return None
    except OSError:
        raise AuthError("Could not read the local account configuration.") from None


def _write_json(name, value):
    temporary = None
    try:
        path = _config_dir() / name
        with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)  # Created private (0600), before any secret is written.
            json.dump(value, stream)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(path)
    except (OSError, TypeError, ValueError):
        raise AuthError("Could not save the local account configuration.") from None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def get_client_config():
    return _read_json("client_config.json")


def save_client_config(config):
    """Save client_id, optional client_secret, and an optional loopback redirect_uri."""
    _write_json("client_config.json", config)


def load_credentials():
    credentials = _read_json("google_credentials.json")
    if not credentials or not isinstance(credentials.get("token"), dict):
        return None
    if not isinstance(credentials.get("user_info"), dict) or not credentials["user_info"].get("sub"):
        return None
    token = credentials["token"]
    if not isinstance(token.get("access_token"), str) or not token["access_token"]:
        return None
    try:
        if not math.isfinite(float(credentials.get("expires_at", 0))):
            return None
    except (TypeError, ValueError):
        return None
    return credentials


def save_credentials(credentials):
    _write_json("google_credentials.json", credentials)


def clear_credentials():
    try:
        (_config_dir() / "google_credentials.json").unlink(missing_ok=True)
    except OSError:
        raise AuthError("Could not remove the saved Google account.") from None


def _active(credentials):
    return bool(credentials and float(credentials.get("expires_at", 0)) > time.time() + 30)


def is_authenticated():
    return _active(load_credentials())


def get_user_info():
    credentials = load_credentials()
    return credentials["user_info"] if _active(credentials) else None


def _redirect_parts(uri):
    try:
        parsed = urlsplit(uri)
        valid = (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1")
                 and parsed.port is not None and not parsed.username and not parsed.password
                 and not parsed.query and not parsed.fragment and not any(c.isspace() for c in uri))
    except (TypeError, ValueError):
        valid = False
    if not valid:
        raise AuthError("Use an HTTP loopback redirect with an explicit port, such as http://127.0.0.1:8080/callback.")
    return parsed


def _token_with_expiry(token):
    if (not isinstance(token, dict) or not isinstance(token.get("access_token"), str)
            or not token["access_token"] or str(token.get("token_type", "")).lower() != "bearer"):
        raise AuthError("Google did not return a usable access token. Please sign in again.")
    try:
        expires_at = float(token["expires_at"]) if "expires_at" in token else time.time() + float(token["expires_in"])
        if not math.isfinite(expires_at) or expires_at <= time.time():
            raise ValueError
    except (KeyError, TypeError, ValueError):
        raise AuthError("Google did not return a usable token expiry. Please sign in again.") from None
    return {**token, "expires_at": expires_at}


class GoogleAuth:
    """Link a Google Desktop OAuth client using loopback HTTP and S256 PKCE.

    Provide client credentials explicitly or via save_client_config(). No client
    credentials ship with Conake, and Conake Studio has no account settings UI.
    Use one instance per flow; authenticate() blocks and belongs off the UI thread.
    """

    def __init__(self, client_id=None, client_secret=None, redirect_uri=None):
        config = get_client_config() or {}
        self.client_id = client_id or config.get("client_id")
        self.client_secret = client_secret if client_secret is not None else config.get("client_secret")
        self.redirect_uri = redirect_uri or config.get("redirect_uri") or DEFAULT_REDIRECT_URI
        if not isinstance(self.client_id, str) or not self.client_id:
            raise AuthError("Configure a Google Desktop OAuth client with save_client_config() or GoogleAuth(client_id=...).")
        if self.client_secret is not None and not isinstance(self.client_secret, str):
            raise AuthError("The Google OAuth client secret must be text.")
        _redirect_parts(self.redirect_uri)
        self._session = None
        self._state = None
        self._verifier = None
        self._code = None
        self._callback_error = None
        self._callback_received = threading.Event()
        self._callback_lock = threading.Lock()

    def _close_session(self):
        if self._session is not None:
            self._session.close()
            self._session = None

    def get_authorization_url(self):
        """Start a fresh authorization attempt; authenticate() manages its listener."""
        self._close_session()
        self._state = secrets.token_urlsafe(32)
        self._verifier = secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(self._verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
        self._code = self._callback_error = None
        self._callback_received.clear()
        self._session = OAuth2Session(self.client_id, scope=SCOPES, redirect_uri=self.redirect_uri, state=self._state)
        url, _ = self._session.authorization_url(GOOGLE_AUTH_URL, access_type="offline", prompt="consent",
                                                 code_challenge=challenge, code_challenge_method="S256")
        return url

    def _accept_callback(self, target):
        """Validate an origin-form callback before allowing any token exchange."""
        try:
            parsed = urlsplit(target)
            expected = _redirect_parts(self.redirect_uri)
            if parsed.scheme or parsed.netloc or parsed.fragment or parsed.path != (expected.path or "/"):
                return 404, "This is not the account callback."
            values = parse_qs(parsed.query, keep_blank_values=True, max_num_fields=20)
        except ValueError:
            return 400, "Invalid account callback."
        states = values.get("state", [])
        if (not self._state or len(states) != 1
                or not secrets.compare_digest(states[0].encode(), self._state.encode())):
            return 400, "The account callback did not match this sign-in attempt."
        codes, errors = values.get("code", []), values.get("error", [])
        if not ((len(codes) == 1 and codes[0] and not errors) or (len(errors) == 1 and errors[0] and not codes)):
            return 400, "Invalid account callback."
        with self._callback_lock:
            if self._callback_received.is_set():
                return 409, "This sign-in callback has already been received."
            if errors:
                self._callback_error = "Google authorization was declined. Please try signing in again."
            else:
                self._code = codes[0]
            self._callback_received.set()
        return 200, "Callback received. Return to your application to finish signing in."

    def _start_callback_server(self):
        owner = self

        class CallbackHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                status, message = owner._accept_callback(self.path)
                body = message.encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_args):
                pass  # Callback URLs contain temporary secrets.

        parsed = _redirect_parts(self.redirect_uri)
        server_type = ThreadingHTTPServer
        if parsed.hostname == "::1":
            class IPv6Server(ThreadingHTTPServer):
                address_family = socket.AF_INET6
            server_type = IPv6Server
        server = server_type(("127.0.0.1" if parsed.hostname == "localhost" else parsed.hostname, parsed.port), CallbackHandler)
        if parsed.port == 0:
            host = "[::1]" if parsed.hostname == "::1" else parsed.hostname
            self.redirect_uri = f"http://{host}:{server.server_port}{parsed.path or '/'}"
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.1}, daemon=True)
        thread.start()
        return server, thread

    def _fetch_user_info(self, session):
        response = session.get(GOOGLE_USERINFO_URL, timeout=REQUEST_TIMEOUT)
        try:
            response.raise_for_status()
            info = response.json()
            if not isinstance(info, dict) or not isinstance(info.get("sub"), str) or not info["sub"]:
                raise AuthError("Google did not return account information. Please try again.")
            return info
        finally:
            response.close()

    def authenticate(self, timeout=300):
        """Open the browser, exchange the verified code over HTTPS, and save the account."""
        if not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or timeout <= 0:
            raise AuthError("The sign-in timeout must be a positive number of seconds.")
        credentials = load_credentials()
        if credentials and credentials.get("client_id") == self.client_id:
            if _active(credentials):
                return credentials["user_info"]
            if self.refresh_token():
                return get_user_info()
        server = thread = None
        try:
            server, thread = self._start_callback_server()
            url = self.get_authorization_url()
            subprocess.run(["xdg-open", url], check=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=min(timeout, REQUEST_TIMEOUT))
            if not self._callback_received.wait(timeout):
                raise AuthError("Sign-in timed out. Please try again.")
            if self._callback_error:
                raise AuthError(self._callback_error)
            # State was checked above. Passing code directly permits loopback HTTP
            # without globally disabling OAuthlib's HTTPS enforcement.
            token = self._session.fetch_token(GOOGLE_TOKEN_URL, code=self._code, code_verifier=self._verifier,
                                              client_secret=self.client_secret, include_client_id=True, timeout=REQUEST_TIMEOUT)
            token = _token_with_expiry(token)
            info = self._fetch_user_info(self._session)
            save_credentials({"token": token, "client_id": self.client_id,
                              "expires_at": token["expires_at"], "user_info": info})
            return info
        except (subprocess.SubprocessError, FileNotFoundError):
            raise AuthError("Could not open the browser. Check your default browser and try again.") from None
        except (requests.RequestException, OAuth2Error, OSError, ValueError):
            raise AuthError("Google sign-in could not finish. Check your connection and OAuth client configuration.") from None
        finally:
            if server is not None:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)
            self._close_session()
            self._code = self._state = self._verifier = None

    def refresh_token(self):
        """Refresh this client's stored account; preserve the credential envelope."""
        credentials = load_credentials()
        if not credentials or credentials.get("client_id") != self.client_id or not credentials["token"].get("refresh_token"):
            return False
        session = OAuth2Session(self.client_id, token=credentials["token"])
        try:
            token = session.refresh_token(GOOGLE_TOKEN_URL, refresh_token=credentials["token"]["refresh_token"],
                                          client_id=self.client_id, client_secret=self.client_secret, timeout=REQUEST_TIMEOUT)
            token = _token_with_expiry(token)
            token.setdefault("refresh_token", credentials["token"]["refresh_token"])
            save_credentials({"token": token, "client_id": self.client_id,
                              "expires_at": token["expires_at"], "user_info": credentials["user_info"]})
            return True
        except (AuthError, requests.RequestException, OAuth2Error, ValueError):
            return False
        finally:
            session.close()

    def logout(self):
        """Remove local credentials; this does not revoke access on Google's servers."""
        self._close_session()
        clear_credentials()
