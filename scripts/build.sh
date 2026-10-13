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
    exec sudo --preserve-env=PATH,CONAKE_BUILD_DIR bash "$0" "$@"
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
if ! umount "$MOUNT_TEST_DIR/proc"; then
    printf 'Could not unmount the build privilege probe; stopping before cleanup.\n' >&2
    exit 1
fi
rmdir "$MOUNT_TEST_DIR/proc" "$MOUNT_TEST_DIR"

# Discard completed stages so changed packages and desktop files reach the next
# ISO. The normal clean preserves downloaded packages; do not use --purge.
if [[ -d "$BUILD_DIR/.build" ]]; then
    (cd "$BUILD_DIR" && lb clean --all)
fi

rm -rf "$BUILD_DIR/config"
cp -a "$CONFIG_DIR" "$BUILD_DIR/config"
chmod 0755 "$BUILD_DIR/config/hooks/live/0900-flathub.hook.chroot"
bash "$ROOT_DIR/scripts/stage-rootfs.sh" "$INCLUDES_DIR"

cd "$BUILD_DIR"
lb config \
    --mode debian \
    --distribution trixie \
    --security false \
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
    --bootappend-live "boot=live components username=conake hostname=conake user-fullname=Conake quiet splash"
lb build

USER_SETUP_STATUS="$(dpkg-query --admindir="$BUILD_DIR/chroot/var/lib/dpkg" \
    -W -f='${Status}' user-setup 2>/dev/null || true)"
if [[ "$USER_SETUP_STATUS" != "install ok installed" ]]; then
    printf 'The live image is missing the user-setup package required to create the conake account.\n' >&2
    exit 1
fi

for boot_config in \
    "$BUILD_DIR/binary/boot/grub/grub.cfg" \
    "$BUILD_DIR/binary/isolinux/live.cfg"; do
    if ! grep -Fq 'username=conake hostname=conake' "$boot_config"; then
        printf 'Expected conake live-user and hostname arguments in %s.\n' "$boot_config" >&2
        exit 1
    fi
    if ! grep -Fq 'user-fullname=Conake' "$boot_config"; then
        printf 'Expected Conake live-session display name in %s.\n' "$boot_config" >&2
        exit 1
    fi
done

LIGHTDM_CONFIG="$BUILD_DIR/config/includes.chroot/etc/lightdm/lightdm.conf.d/50-conake.conf"
for setting in '[Seat:*]' 'autologin-user=conake' 'autologin-user-timeout=0'; do
    if ! grep -Fqx "$setting" "$LIGHTDM_CONFIG"; then
        printf 'Missing LightDM live autologin setting: %s\n' "$setting" >&2
        exit 1
    fi
done

if [[ ! -s "$BUILD_DIR/live-image-amd64.hybrid.iso" ]]; then
    printf 'live-build completed without producing its expected ISO.\n' >&2
    exit 1
fi

install -m 0644 "$BUILD_DIR/live-image-amd64.hybrid.iso" "$ISO_PATH"
printf 'Built ISO: %s\n' "$ISO_PATH"
