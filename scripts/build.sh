#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT_DIR/boot/live-build/config"
ISO_PATH="$ROOT_DIR/dist/conake-os-v0.1-amd64.iso"

if [[ "$EUID" -ne 0 ]]; then
    if ! command -v sudo >/dev/null 2>&1; then
        printf 'This build needs root privileges; install sudo or run as root.\n' >&2
        exit 1
    fi
    export CONAKE_BUILD_DIR="${CONAKE_BUILD_DIR:-$HOME/.cache/conake-os/live-build}"
    exec sudo --preserve-env=PATH,CONAKE_BUILD_DIR "$0" "$@"
fi

BUILD_DIR="${CONAKE_BUILD_DIR:-$HOME/.cache/conake-os/live-build}"
INCLUDES_DIR="$BUILD_DIR/config/includes.chroot"

for tool in lb mksquashfs xorriso; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Missing build tool: %s\n' "$tool" >&2
        exit 1
    fi
done

mkdir -p "$BUILD_DIR" "$ROOT_DIR/dist"
MOUNT_TEST_DIR="$BUILD_DIR/.mount-test"
mkdir -p "$MOUNT_TEST_DIR/proc"
if ! mount --bind /proc "$MOUNT_TEST_DIR/proc" >/dev/null 2>&1; then
    printf 'live-build requires mount privileges to create a Debian chroot. In GitHub Codespaces, enable a privileged devcontainer with --privileged and SYS_ADMIN.\n' >&2
    exit 1
fi
umount "$MOUNT_TEST_DIR/proc" >/dev/null 2>&1 || true
rm -rf "$MOUNT_TEST_DIR"

rm -rf "$BUILD_DIR/config"
cp -a "$CONFIG_DIR" "$BUILD_DIR/config"
mkdir -p "$INCLUDES_DIR"
cp -a "$ROOT_DIR/system/." "$INCLUDES_DIR/"
cp -a "$ROOT_DIR/apps/welcome/." "$INCLUDES_DIR/"
cp -a "$ROOT_DIR/apps/browser/." "$INCLUDES_DIR/"
mkdir -p "$INCLUDES_DIR/usr/share/conake/branding"
cp -a "$ROOT_DIR/assets/branding/." "$INCLUDES_DIR/usr/share/conake/branding/"
mkdir -p "$INCLUDES_DIR/usr/share/backgrounds/conake"
cp -a "$ROOT_DIR/assets/branding/wallpapers/." "$INCLUDES_DIR/usr/share/backgrounds/conake/"
install -m 0644 "$ROOT_DIR/assets/branding/wallpaper.svg" \
    "$INCLUDES_DIR/usr/share/backgrounds/conake/conake-minimal.svg"
mkdir -p "$INCLUDES_DIR/usr/share/applications"
install -m 0644 "$ROOT_DIR/apps/store/usr/share/applications/conake-store.desktop" \
    "$INCLUDES_DIR/usr/share/applications/conake-store.desktop"
chmod 0755 \
    "$INCLUDES_DIR/usr/local/sbin/conake-memory-profile" \
    "$INCLUDES_DIR/usr/local/bin/conake-welcome"
mkdir -p "$INCLUDES_DIR/etc/systemd/system/multi-user.target.wants"
ln -sfn ../conake-memory-profile.service \
    "$INCLUDES_DIR/etc/systemd/system/multi-user.target.wants/conake-memory-profile.service"

cd "$BUILD_DIR"
lb config \
    --distribution trixie \
    --architectures amd64 \
    --linux-packages linux-image \
    --linux-flavours amd64 \
    --binary-images iso-hybrid \
    --archive-areas "main contrib non-free non-free-firmware" \
    --apt-recommends false \
    --mirror-bootstrap http://deb.debian.org/debian/ \
    --mirror-chroot http://deb.debian.org/debian/ \
    --mirror-chroot-security http://security.debian.org/debian-security/ \
    --mirror-binary http://deb.debian.org/debian/ \
    --mirror-binary-security http://security.debian.org/debian-security/ \
    --bootappend-live "boot=live components username=conake hostname=conake quiet splash"
lb build

if [[ ! -s "$BUILD_DIR/live-image-amd64.hybrid.iso" ]]; then
    printf 'live-build completed without producing its expected ISO.\n' >&2
    exit 1
fi

install -m 0644 "$BUILD_DIR/live-image-amd64.hybrid.iso" "$ISO_PATH"
printf 'Built ISO: %s\n' "$ISO_PATH"