#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${CONAKE_BUILD_DIR:-$HOME/.cache/conake-os/live-build}"
if [[ "$EUID" -eq 0 ]]; then
	rm -rf "$BUILD_DIR" "$ROOT_DIR/.build" "$ROOT_DIR/dist"
else
	sudo rm -rf "$BUILD_DIR" "$ROOT_DIR/.build" "$ROOT_DIR/dist"
fi
printf 'Removed generated Conake build files.\n'