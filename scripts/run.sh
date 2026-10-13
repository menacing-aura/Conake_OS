#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ISO_PATH="$ROOT_DIR/dist/conake-os-v0.1-amd64.iso"
RAM_MB="${CONAKE_RAM_MB:-2048}"
CPU_COUNT="${CONAKE_CPUS:-2}"
WEB_PORT="${CONAKE_WEB_PORT:-6080}"
VNC_PORT="${CONAKE_VNC_PORT:-5901}"
WEBSOCKIFY_PID=""

usage() {
    printf 'Usage: %s [--help]\n' "$0"
    printf 'Boot the latest ISO in QEMU; browser preview is served on port %s.\n' "$WEB_PORT"
    printf 'Override memory and CPUs with CONAKE_RAM_MB and CONAKE_CPUS.\n'
}

if [[ "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi
if [[ "$#" -gt 0 ]]; then
    usage >&2
    exit 2
fi
if [[ ! -s "$ISO_PATH" ]]; then
    printf 'ISO not found: %s (run ./scripts/build.sh first)\n' "$ISO_PATH" >&2
    exit 1
fi
for tool in qemu-system-x86_64 websockify; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Missing runtime tool: %s\n' "$tool" >&2
        exit 1
    fi
done

cleanup() {
    if [[ -n "$WEBSOCKIFY_PID" ]]; then
        kill "$WEBSOCKIFY_PID" 2>/dev/null || true
        wait "$WEBSOCKIFY_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

NOVNC_DIR="/usr/share/novnc"
if [[ ! -d "$NOVNC_DIR" ]]; then
    NOVNC_DIR="/usr/lib/novnc"
fi
websockify --web="$NOVNC_DIR" "$WEB_PORT" "127.0.0.1:$VNC_PORT" &
WEBSOCKIFY_PID=$!

printf 'Starting Conake OS in QEMU. Open http://localhost:%s/vnc.html?autoconnect=true&resize=scale\n' "$WEB_PORT"
qemu-system-x86_64 \
    -machine accel=kvm:tcg \
    -m "$RAM_MB" \
    -smp "$CPU_COUNT" \
    -cdrom "$ISO_PATH" \
    -boot order=d \
    -vnc "127.0.0.1:$((VNC_PORT - 5900))" \
    -display none \
    -serial mon:stdio