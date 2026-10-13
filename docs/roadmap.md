# Conake OS roadmap

Conake OS is a Debian Trixie live desktop prototype. This roadmap separates
source code that exists from proposed work; a checked-in implementation is
not evidence that an ISO boots or that hardware is supported. Milestones are
ordered by dependencies, without release-date promises. No GitHub issues or
milestones are created by this document.

The current base keeps Debian's kernel, systemd, PAM, APT, NetworkManager, and
XFCE. Python tools should integrate with these components before replacing
them. Preserve Debian live-build **`1:20250505+deb13u1`**; do not reinstall the
older Ubuntu live-build package. Users should remain free to choose their
own wallpaper and taskbar appearance.

Status meanings: **Present** means source or configuration exists;
**Current** is the first implementation milestone; **Planned** has no delivery
claim; **Research** needs an architecture decision and a disposable prototype.

## 0. Stabilize the live desktop

| Capability | Status | Acceptance before release |
| --- | --- | --- |
| Live USB image and ISO pipeline | Present: Debian Live configuration and build/run scripts | Successful Actions artifact; boot amd64 in BIOS and UEFI VMs; verify desktop, network, reboot, and shutdown; test a USB boot separately. |
| Docker build environment | Present: development container | Build from a clean container with recorded inputs. Digest-pinned base images, Debian snapshots, and matching outputs from two isolated builds are required before claiming reproducibility. |
| CI/CD | Present: ISO workflow for `main`, `conake-os`, PRs, and manual runs | Gate changes with unit/static checks, build the container and ISO, retain useful failure logs, and restrict publishing to intended release runs. |
| Wallpapers, themes, and branding | Present: assets and native Conake Studio source | Import and switch the user's own images; persist preferences; validate selected-panel themes, size, location, opacity, clock, workspaces, and focus timer in a real XFCE session. |
| Unit and integration tests | Present: desktop regression tests; Current: CLI tests | Test malformed configuration, denied operations, missing tools, and failed subprocesses; run GUI/session smoke tests and ISO boot tests separately from mocks. |

Release gate: report exactly which commit, build, boot mode, and test environment
were exercised. A green unit test does not establish a bootable image. Test the
newer `conake-os` branch before reviewing its merge with `main`.

## 1. Python system control foundation

| Capability | Status | Acceptance |
| --- | --- | --- |
| Unified `conakectl` CLI | Current | Read system status, inspect/control services through systemd, read journal logs, validate TOML configuration, and open desktop settings. Provide useful exit codes and errors without shell command interpolation. |
| Service manager and supervisor | Present: systemd; Current: Python CLI adapter | Keep PID tracking, restart policy, and dependency ordering in systemd units; demonstrate ordered startup and failed-service recovery in a VM. |
| ConakePKG | Current: Python frontend to APT | Provide install/remove/update operations through Debian's package tools; preserve repository signature verification, explicit authorization, dependency handling, and useful failure codes. Independent package storage/transactions remain future work. |
| Central logging and log viewer | Present: systemd journal; Current: CLI viewer | Support bounded log output and service selection, preserve permission errors, and document log retention and redaction. |
| Configuration as code | Current: validated TOML foundation | Reject unknown keys and invalid types before applying anything; publish example configuration and distinguish validation from application. |

This milestone does not replace PID 1, implement a package transaction engine,
or silently grant administrative privileges. Commands that change system
state must use the operating system's existing authorization mechanisms.
The five current deliverables are the unified CLI, service control, APT-backed
ConakePKG, log viewer, and TOML validation. The recommended next milestone is
validating the Docker build environment and container/ISO CI before work on
an installer or a custom init system.

## 2. Integrate daily system management

| Capability | Status | Acceptance |
| --- | --- | --- |
| Network manager | Present: NetworkManager; Planned: Python API/CLI | Use NetworkManager's API for wired/Wi-Fi state and changes; test reconnect, unavailable devices, authentication failures, and offline behavior without exposing credentials. |
| Users, groups, and sessions | Present: Debian/PAM and LightDM; Planned: management commands | Use supported account/session interfaces, require appropriate authorization, and test group membership, locked accounts, and session cleanup in disposable VMs. |
| Docker runtime integration | Planned | Detect an optional Docker installation, expose container lifecycle/status, and report daemon/permission failures. Document that Docker access can grant host-level privileges. |
| Device probing and module loader | Present: Debian kernel/udev; Planned: diagnostics | Report discovered hardware and driver bindings; any explicit module-loading command needs authorization and a tested failure path. |
| Hardware compatibility database | Planned | Record exact device IDs, ISO/commit, firmware, test steps, working features, and known failures. Never mark untested devices supported. |
| Performance benchmarks | Planned | Measure boot time, idle memory, and IPC latency with scripts; record hardware, VM settings, cold/warm runs, sample counts, and variance. |
| Python ecosystem examples | Planned | Provide small runnable status, service, and desktop examples with documented dependencies and no unnecessary root access. |
| Developer SDK and API docs | Planned; current CLI usage is documented | Document compatibility, errors, permissions, and a working service lifecycle example; do not call internal modules a stable SDK. |
| Example configurations/dotfiles | Planned | Ship opt-in desktop/server examples with validation and restore instructions; do not overwrite a user's existing configuration. |
| Accessibility | Planned | Test keyboard-only use, focus order, readable scaling, high-contrast themes, and a screen-reader-supported UI path. Current Tk styling is not an accessibility certification. |
| Localization | Planned | Extract gettext messages for UI, CLI, and future installer; test translated strings, plural forms, non-ASCII paths, and layout expansion. |

## 3. Installation, packages, and recovery

These features require an installed-system storage and trust design first.
The current live image does not install to disk.

| Capability | Status | Acceptance |
| --- | --- | --- |
| FHS-like layout and automated installer | Present: staged `/etc`, `/usr`, and `/run` files; Planned: installer | Document owned paths and persistent state. Start with a dry-run disk plan; require explicit target selection and confirmation before writes; test empty disks, existing partitions, bootloader failure, and interrupted installation in disposable VMs. |
| Optional installer GUI | Planned | Wrap the same validated installer engine, show the target and destructive steps clearly, and test cancellation, recovery, keyboard navigation, and translated errors. |
| Independent Conake package format | Planned beyond the APT frontend | A separate format needs dependency resolution, ownership/conflict rules, install/uninstall/update transactions, interruption recovery, and migration tests before use. |
| Package repository server | Planned | Define versioned metadata and a simple HTTP API; test publishing, missing packages, unavailable mirrors, and atomic metadata updates. A test server is not a production repository. |
| Package signing and verification | Planned | Define trusted GPG keys or equivalent, key rotation/revocation, signed metadata and package integrity, and rejection tests for tampering, expired/untrusted keys, and stale metadata. Verify before extraction or installation. |
| Snapshots and rollback | Research | Choose a supported installed filesystem layout and test btrfs snapshots or an overlayfs-based design in VMs. Document persistence, capacity limits, boot selection, and what data is excluded; snapshots are not backups. |
| Automatic updates and delta delivery | Planned, after transactions and recovery | Make updates opt-in initially; verify signatures, power-loss recovery, health checks, and bootable rollback. Validate a full-image fallback before adding delta updates. Never promise automatic rollback until failure injection passes. |
| Hardening profile | Planned | Define supported ufw/firewall and AppArmor/SELinux policies plus seccomp guidance; test required services and recovery. Keep a documented threat model and exceptions rather than claiming the distribution is secure by default. |
| Sandboxed app runner | Research | Evaluate existing namespace/seccomp tooling; test filesystem, device, process, and network boundaries plus permission prompts. Do not present a Python subprocess wrapper as a sandbox. |
| UEFI Secure Boot | Planned guidance | Document the boot chain, signing/key custody, enrollment, revocation, and recovery; test signed boot and rejection of a modified component in UEFI VMs before claiming support. |

## 4. Optional platform experiments

| Capability | Status | Acceptance |
| --- | --- | --- |
| Minimal Python init | Research; systemd remains default | In a disposable image only, test PID 1 signal handling, child reaping, PID reuse, supervision, dependency cycles, emergency console, mount ordering, and orderly shutdown. Compare against systemd before any replacement proposal. |
| Lightweight GUI stack | Research; XFCE remains default | Evaluate maintained wlroots/Python bindings and packaging; test input, display hotplug, sessions, accessibility, and an XFCE fallback before adding an optional image. |
| Minimal kernel configuration guide | Planned | Publish tested amd64 options for storage, filesystems, networking, namespaces, cgroups, graphics, and recovery, with a known-good Debian kernel fallback. |
| Raspberry Pi/SBC ports | Research | Select one exact board, then validate arm64 bootstrap, firmware licensing, boot media, graphics, networking, and updates on that hardware. An amd64 ISO cannot establish SBC support. |
| Remote management agent | Research | Define authentication, authorization, encrypted transport, audit logs, command limits, revocation, and update trust. Keep disabled by default; test unauthorized requests and interrupted operations before deployment. |
| Optional web admin UI | Planned, after authenticated management API | Read services/logs/update status first; test access control, CSRF protection, session expiry, and output escaping before exposing changes. Bind locally by default. |
| Opt-in telemetry/error reporting | Planned | Remain off until explicitly enabled; document fields, destination, retention, and deletion. Preview/redact reports, avoid identifiers and credentials, and verify disablement stops transmission. |

## Community and release tracking

The [contribution guide](../CONTRIBUTING.md),
[code of conduct](../CODE_OF_CONDUCT.md), issue forms, and PR template are
present as project scaffolding. Maintainers should turn accepted roadmap rows
into GitHub issues with an owner, dependencies, testable scope, and a milestone.
Track evidence and remaining limitations in each issue; do not close a feature
because only its CLI placeholder or documentation exists.
