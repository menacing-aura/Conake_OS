#!/usr/bin/env bash
# Assemble Conake's live filesystem additions; also testable without root.
set -euo pipefail

if [[ $# -ne 1 || -z "$1" || "$1" == / ]]; then
    printf 'Usage: bash %s STAGING_DIRECTORY\n' "$0" >&2
    exit 2
fi
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INCLUDES_DIR="$1"
mkdir -p "$INCLUDES_DIR"
cp -a "$ROOT_DIR/system/." "$INCLUDES_DIR/"
for app in welcome browser settings control auth; do
    tar --exclude='__pycache__' --exclude='*.pyc' --exclude='*.pyo' \
        -C "$ROOT_DIR/apps/$app" -cf - . | tar -C "$INCLUDES_DIR" -xf -
done
mkdir -p "$INCLUDES_DIR/usr/share/conake/branding"
install -m 0644 "$ROOT_DIR/assets/branding/conake-logo.svg" \
    "$INCLUDES_DIR/usr/share/conake/branding/conake-logo.svg"
mkdir -p "$INCLUDES_DIR/usr/share/backgrounds/conake"
for wallpaper in "$ROOT_DIR/assets/branding/wallpapers/"*.svg "$ROOT_DIR/assets/branding/wallpapers/"*.png; do
    [[ -f "$wallpaper" ]] || continue
    install -m 0644 "$wallpaper" "$INCLUDES_DIR/usr/share/backgrounds/conake/"
done
install -m 0644 "$ROOT_DIR/assets/branding/wallpaper.svg" \
    "$INCLUDES_DIR/usr/share/backgrounds/conake/conake-minimal.svg"
mkdir -p "$INCLUDES_DIR/usr/share/applications"
install -m 0644 "$ROOT_DIR/apps/store/usr/share/applications/conake-store.desktop" \
    "$INCLUDES_DIR/usr/share/applications/conake-store.desktop"
chmod 0755 \
    "$INCLUDES_DIR/usr/local/sbin/conake-memory-profile" \
    "$INCLUDES_DIR/usr/local/bin/conake-welcome" \
    "$INCLUDES_DIR/usr/local/bin/conake-settings" \
    "$INCLUDES_DIR/usr/local/bin/conake-island" \
    "$INCLUDES_DIR/usr/local/bin/conakectl" \
    "$INCLUDES_DIR/usr/local/bin/conakepkg"
mkdir -p "$INCLUDES_DIR/etc/systemd/system/multi-user.target.wants"
ln -sfn ../conake-memory-profile.service \
    "$INCLUDES_DIR/etc/systemd/system/multi-user.target.wants/conake-memory-profile.service"
ln -sfn /lib/systemd/system/earlyoom.service \
    "$INCLUDES_DIR/etc/systemd/system/multi-user.target.wants/earlyoom.service"
