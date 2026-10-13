"""Offline account-linking regressions; no browser, socket, or Google requests."""

import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlencode, urlsplit

import requests

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("conake_auth", ROOT / "apps/auth/usr/share/conake/auth/__init__.py")
auth_module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = auth_module
SPEC.loader.exec_module(auth_module)
core = sys.modules["conake_auth.core"]


class AuthTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="conake-auth-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        environment = mock.patch.dict(os.environ, {"XDG_CONFIG_HOME": str(self.directory)})
        environment.start()
        self.addCleanup(environment.stop)
        # Fail any accidentally unmocked HTTP request in these tests.
        self.transport = mock.patch.object(requests.sessions.Session, "request", side_effect=AssertionError("Unexpected network access"))
        self.request = self.transport.start()
        self.addCleanup(self.transport.stop)
        self.auth = core.GoogleAuth(client_id="test-client", client_secret="test-secret")
        self.addCleanup(self.auth._close_session)
        self.user = {"sub": "user-123", "email": "user@example.test"}
        self.token = {"access_token": "test-access", "refresh_token": "test-refresh", "token_type": "Bearer", "expires_in": 3600}
        self.server, self.thread = mock.Mock(), mock.Mock()

    def response(self, url, body, status=200):
        response = requests.Response()
        response.status_code = status
        response._content = json.dumps(body).encode()
        response.encoding = "utf-8"
        response.url = url
        response.request = requests.Request("POST", url).prepare()
        return response

    def provider(self, method, url, **kwargs):
        self.assertEqual(kwargs["timeout"], core.REQUEST_TIMEOUT)
        if url == core.GOOGLE_TOKEN_URL:
            self.assertEqual(method.upper(), "POST")
            return self.response(url, self.token)
        if url == core.GOOGLE_USERINFO_URL:
            self.assertEqual(method.upper(), "GET")
            self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-access")
            return self.response(url, self.user)
        self.fail("Unexpected provider endpoint")

    def callback(self, **values):
        path = urlsplit(self.auth.redirect_uri).path
        return self.auth._accept_callback(path + "?" + urlencode({"state": self.auth._state, **values}))

    def browser_callback(self, argv, **kwargs):
        self.assertEqual(argv[0], "xdg-open")
        self.assertTrue(kwargs["check"])
        params = parse_qs(urlsplit(argv[1]).query)
        self.assertEqual(params["state"], [self.auth._state])
        self.assertEqual(self.callback(code="test-code")[0], 200)
        return subprocess.CompletedProcess(argv, 0)

    def flow(self, browser=None, timeout=1):
        with mock.patch.object(self.auth, "_start_callback_server", return_value=(self.server, self.thread)), \
                mock.patch.object(core.subprocess, "run", side_effect=browser or self.browser_callback):
            return self.auth.authenticate(timeout=timeout)

    def stored(self, expires=None, client="test-client"):
        return {"token": dict(self.token), "client_id": client,
                "expires_at": expires if expires is not None else time.time() + 3600,
                "user_info": dict(self.user)}

    def assert_closed(self):
        self.server.shutdown.assert_called_once()
        self.server.server_close.assert_called_once()
        self.thread.join.assert_called_once()
        self.assertIsNone(self.auth._session)
        self.assertIsNone(self.auth._verifier)
        self.assertIsNone(self.auth._state)

    def test_package_exports_without_missing_ui(self):
        self.assertIs(auth_module.GoogleAuth, core.GoogleAuth)
        self.assertFalse(hasattr(auth_module, "AuthWindow"))
        self.assertEqual(self.auth.redirect_uri, core.DEFAULT_REDIRECT_URI)

    def test_saved_config_and_explicit_overrides(self):
        core.save_client_config({"client_id": "saved", "client_secret": "saved-secret",
                                 "redirect_uri": "http://localhost:8942/link/google"})
        loaded = core.GoogleAuth(client_id="override")
        self.assertEqual((loaded.client_id, loaded.client_secret, loaded.redirect_uri),
                         ("override", "saved-secret", "http://localhost:8942/link/google"))
        self.assertEqual(stat.S_IMODE((core._config_dir() / "client_config.json").stat().st_mode), 0o600)

    def test_redirect_rejects_remote_and_ambiguous_urls(self):
        for uri in ("https://127.0.0.1:8080/callback", "http://evil.example:8080/callback",
                    "http://127.0.0.1/callback", "http://0.0.0.0:8080/callback",
                    "http://user@localhost:8080/callback", "http://localhost:8080/callback?foo=bar",
                    "http://localhost:8080/callback#fragment", "http://localhost:99999/callback"):
            with self.subTest(uri=uri), self.assertRaises(core.AuthError):
                core.GoogleAuth(client_id="test", redirect_uri=uri)
        self.assertEqual(core.GoogleAuth(client_id="test", redirect_uri="http://[::1]:8400/return").redirect_uri,
                         "http://[::1]:8400/return")

    def test_authorization_contains_fresh_state_and_pkce(self):
        first = parse_qs(urlsplit(self.auth.get_authorization_url()).query)
        verifier = self.auth._verifier
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        self.assertEqual(first["code_challenge"], [challenge])
        self.assertEqual(first["code_challenge_method"], ["S256"])
        self.assertEqual(first["response_type"], ["code"])
        self.assertEqual(first["redirect_uri"], [core.DEFAULT_REDIRECT_URI])
        self.assertGreaterEqual(len(verifier), 43)
        second = parse_qs(urlsplit(self.auth.get_authorization_url()).query)
        self.assertNotEqual(first["state"], second["state"])
        self.assertNotEqual(first["code_challenge"], second["code_challenge"])
        self.request.assert_not_called()

    def test_bad_callbacks_do_not_complete_or_trigger_requests(self):
        self.auth.get_authorization_url()
        state = self.auth._state
        for target in ("/favicon.ico", "/callback?code=x", "/callback?state=wrong&code=x",
                       "/callback?state=%E2%98%83&code=x", "/callback?state=" + state,
                       "/callback?state=" + state + "&code=x&code=y",
                       "/callback?state=" + state + "&code=x&error=denied",
                       "http://evil.example/callback?state=" + state + "&code=x"):
            with self.subTest(target=target):
                self.assertIn(self.auth._accept_callback(target)[0], (400, 404))
                self.assertFalse(self.auth._callback_received.is_set())
        self.request.assert_not_called()
        self.assertEqual(self.callback(code="valid")[0], 200)
        self.assertEqual(self.callback(code="duplicate")[0], 409)
        self.assertEqual(self.auth._code, "valid")

    def test_code_is_exchanged_then_user_fetched_and_private_credentials_saved(self):
        self.request.side_effect = self.provider
        self.assertEqual(self.flow(), self.user)
        token_call = self.request.call_args_list[0]
        data = token_call.kwargs["data"]
        self.assertEqual(data["code"], "test-code")
        self.assertEqual(data["grant_type"], "authorization_code")
        self.assertEqual(data["redirect_uri"], core.DEFAULT_REDIRECT_URI)
        self.assertEqual(data["client_id"], "test-client")
        self.assertGreaterEqual(len(data["code_verifier"]), 43)
        saved = core.load_credentials()
        self.assertEqual(saved["user_info"], self.user)
        self.assertEqual(saved["token"]["access_token"], "test-access")
        self.assertNotIn("client_secret", saved)
        self.assertTrue(core.is_authenticated())
        path = core._config_dir() / "google_credentials.json"
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(path.parent.stat().st_mode), 0o700)
        self.assert_closed()

    def test_denial_never_exchanges_code_or_echoes_provider_details(self):
        def denied(*_args, **_kwargs):
            self.callback(error="secret-provider-message")
        with self.assertRaisesRegex(core.AuthError, "declined") as failure:
            self.flow(browser=denied)
        self.assertNotIn("secret-provider-message", str(failure.exception))
        self.request.assert_not_called()
        self.assert_closed()

    def test_nonzero_browser_exit_and_timeout_close_listener_and_session(self):
        for error in (subprocess.CalledProcessError(1, "xdg-open", stderr="test-secret"),
                      FileNotFoundError(), subprocess.TimeoutExpired("xdg-open", 15)):
            self.server.reset_mock()
            self.thread.reset_mock()
            with self.subTest(error=type(error).__name__), self.assertRaisesRegex(core.AuthError, "browser"):
                self.flow(browser=mock.Mock(side_effect=error))
            self.assert_closed()
        self.request.assert_not_called()

    def test_callback_timeout_closes_resources(self):
        with self.assertRaisesRegex(core.AuthError, "timed out"):
            self.flow(browser=lambda *_a, **_kw: None, timeout=0.001)
        self.request.assert_not_called()
        self.assert_closed()

    def test_provider_error_leaves_previous_credentials_and_does_not_leak(self):
        previous = self.stored(client="another-client")
        core.save_credentials(previous)
        self.request.side_effect = requests.RequestException("access_token=secret-provider-message")
        with self.assertRaises(core.AuthError) as failure:
            self.flow()
        self.assertNotIn("secret-provider-message", str(failure.exception))
        self.assertEqual(core.load_credentials(), previous)
        self.assert_closed()

    def test_refresh_uses_session_endpoint_and_preserves_envelope_and_refresh_token(self):
        previous = self.stored(expires=time.time() - 10)
        previous["client_secret"] = "legacy-secret"
        core.save_credentials(previous)
        self.token.pop("refresh_token")
        self.request.side_effect = self.provider
        self.assertTrue(self.auth.refresh_token())
        call = self.request.call_args
        # The URL is passed as a positional argument, not a keyword argument
        self.assertEqual(call.args[1], core.GOOGLE_TOKEN_URL)
        self.assertEqual(call.kwargs["data"]["grant_type"], "refresh_token")
        self.assertEqual(call.kwargs["data"]["refresh_token"], "test-refresh")
        saved = core.load_credentials()
        self.assertEqual(saved["user_info"], self.user)
        self.assertEqual(saved["token"]["refresh_token"], "test-refresh")
        self.assertNotIn("client_secret", saved)
        self.assertTrue(core.is_authenticated())

    def test_refresh_failure_preserves_credentials_and_returns_false(self):
        previous = self.stored(expires=time.time() - 10)
        core.save_credentials(previous)
        self.request.side_effect = requests.RequestException("test-secret")
        self.assertFalse(self.auth.refresh_token())
        self.assertEqual(core.load_credentials(), previous)

    def test_expired_saved_account_refreshes_without_browser(self):
        core.save_credentials(self.stored(expires=time.time() - 10))
        self.request.side_effect = self.provider
        with mock.patch.object(core.subprocess, "run", side_effect=AssertionError("Unexpected browser")):
            self.assertEqual(self.auth.authenticate(), self.user)
        self.assertEqual(self.request.call_count, 1)

    def test_current_credentials_skip_browser_and_different_client_cannot_refresh(self):
        core.save_credentials(self.stored())
        self.assertEqual(self.auth.authenticate(), self.user)
        other = core.GoogleAuth(client_id="other-client")
        self.assertFalse(other.refresh_token())
        self.request.assert_not_called()

    def test_corrupt_files_and_logout(self):
        path = core._config_dir() / "google_credentials.json"
        for value in ("invalid", "[]", '{"token":null}', '{"token":{"access_token":"x"},"user_info":{"sub":"x"},"expires_at":"oops"}'):
            path.write_text(value)
            self.assertIsNone(core.load_credentials())
            self.assertFalse(core.is_authenticated())
        core.save_credentials(self.stored())
        self.auth.logout()
        self.assertFalse(path.exists())
        self.assertIsNone(core.get_user_info())

    def test_failed_atomic_replace_retains_existing_private_credentials(self):
        previous = self.stored()
        core.save_credentials(previous)
        with mock.patch.object(Path, "replace", side_effect=OSError("test-secret")), self.assertRaises(core.AuthError):
            core.save_credentials({**previous, "client_id": "changed"})
        self.assertEqual(core.load_credentials(), previous)
        self.assertEqual([path.name for path in core._config_dir().iterdir()], ["google_credentials.json"])

    def test_configured_listener_address_path_and_ephemeral_port(self):
        self.auth.redirect_uri = "http://localhost:0/custom/return"
        server = mock.Mock(server_port=45678)
        with mock.patch.object(core, "ThreadingHTTPServer", return_value=server) as factory, \
                mock.patch.object(core.threading, "Thread") as thread:
            result, worker = self.auth._start_callback_server()
        self.assertIs(result, server)
        self.assertIs(worker, thread.return_value)
        self.assertEqual(factory.call_args.args[0], ("127.0.0.1", 0))
        self.assertEqual(self.auth.redirect_uri, "http://localhost:45678/custom/return")
        self.auth.get_authorization_url()
        self.assertEqual(self.callback(code="test-code")[0], 200)


if __name__ == "__main__":
    unittest.main()
