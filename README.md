# Conake OS

Conake OS v0.1 is a Debian-based live desktop prototype. It uses Debian Live and
XFCE rather than a custom kernel, with boot-time RAM profiling, zRAM, a small
welcome screen, and a reproducible ISO build workflow.

## Build and run

Open this repository in GitHub Codespaces, wait for the development container
to finish setup, then run:

```sh
./scripts/build.sh
./scripts/run.sh
```

The ISO is written to `dist/conake-os-v0.1-amd64.iso`; the privileged build
tree lives in `~/.cache/conake-os/` so debootstrap can execute outside the
Codespaces noexec workspace mount. The run script starts QEMU and a
browser-accessible noVNC session on port 6080. Use
`./scripts/run.sh --help` for options. Build output is ignored by Git; CI
uploads the ISO as a downloadable workflow artifact.

The first build downloads Debian packages and can take a while. A successful
build requires network access and several gigabytes of free disk space.

## Project layout

- `.devcontainer/`: Codespaces image and editor extensions
- `boot/`: Debian Live image configuration
- `system/`: Conake runtime services and system configuration
- `desktop/`: desktop direction and future custom shell
- `apps/`: Conake applications, including the v0.1 welcome screen
- `installer/`: reserved for a future installer
- `scripts/`: ISO build, QEMU run, and cleanup commands
- `assets/`: replaceable Conake logos and wallpapers
- `docs/`: architecture, build, and memory behavior notes

## Prototype scope

The live image creates a `conake` session, starts XFCE, and detects installed
RAM early in boot. It selects ultra-light (<2 GB), lightweight (2-4 GB), normal
(4-8 GB), or full (8 GB+) mode, then sizes zRAM accordingly. `earlyoom` acts
as a last-resort guard when both available RAM and swap fall below 5%; it may
terminate a process under severe pressure and does not unload individual
browser tabs. The first release does not install to disk; an installer,
persistent swap setup, and custom desktop are future milestones.