"""Optional Conake Google account-linking API (no OS login integration or UI)."""

from .core import (
    AuthError, GoogleAuth, clear_credentials, get_client_config, get_user_info,
    is_authenticated, load_credentials, save_client_config, save_credentials,
)

__all__ = [
    "AuthError", "GoogleAuth", "clear_credentials", "get_client_config", "get_user_info",
    "is_authenticated", "load_credentials", "save_client_config", "save_credentials",
]
