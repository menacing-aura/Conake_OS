# Contributing to Conake OS

Conake OS is a Debian Trixie live desktop prototype. See the
[roadmap](docs/roadmap.md) for current work and proposed features, and follow
the [code of conduct](CODE_OF_CONDUCT.md).

## Start from the right branch

The newer OS work is on `conake-os`; `main` has diverged and may contain other
changes. Base OS fixes on `conake-os` and open a pull request against that
branch unless maintainers specify otherwise. Review differences before any
merge into `main`. Keep each PR focused and preserve other contributors' work.

Describe the observed problem, expected behavior, and how to reproduce it.
For a larger roadmap item, agree on a bounded first milestone before changing
the boot, storage, authentication, or package architecture.

## Development and checks

Use the development container or the tools described in
[development notes](docs/development.md). Python tests require Python 3.11+
and Pillow (`python3-pil` on Debian); GUI checks additionally need Tk,
Pillow's ImageTk, XFCE, and a desktop session. Do not run unit tests as root.

From the repository root:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
bash -n scripts/build.sh scripts/run.sh scripts/clean.sh
shellcheck scripts/build.sh scripts/run.sh scripts/clean.sh
git diff --check
```

Add regression tests for behavior changes and failure handling. Tests should
use temporary directories and mocked system tools instead of modifying the
host's services, users, network, or disks. Keep argument lists explicit when
calling subprocesses; do not interpolate user input into shell commands.

For desktop changes, also test in an XFCE session: import and switch a custom
wallpaper, apply settings, close/reopen the app, and check that other panels
retain their settings. Exercise inaccessible files and unavailable desktop
services. A virtual display smoke test is useful but does not replace testing
the real desktop.

## Build and boot validation

```sh
bash ./scripts/build.sh
bash ./scripts/run.sh
```

The ISO build needs network access, several gigabytes of free space, and
privileged build operations. Preserve Debian live-build
**`1:20250505+deb13u1`**, `cpio`, and `debootstrap`; do not switch to Ubuntu's
older live-build package. Invoke shell entrypoints with Bash where executable
bits may be missing. A development container improves consistency but does
not alone establish byte-for-byte reproducible outputs.

For boot-related changes, record the commit, workflow run/artifact, BIOS or
UEFI mode, VM/hardware details, and observed results. Check desktop startup,
network access, service failures, reboot, and shutdown. Use disposable VMs
and virtual disks for future installer, rollback, package, and PID 1 tests.
Do not use a contributor's working system as a destructive test target.

The ISO workflow accepts pushes to `main` and `conake-os`, pull requests, and
manual dispatch. Validate the branch artifact before merging. Version tags
can publish releases; create them only as part of an intentional release.

## Before opening a pull request

- Explain the concrete behavior change and link the relevant issue, if any.
- Include the checks run, results, and untested environments or limitations.
- Update documentation and examples when commands or defaults change.
- Keep Debian systemd, PAM, APT, and NetworkManager as the supported base
  unless a separately reviewed design changes that decision.
- Remove credentials, personal data, generated ISOs, and private paths from
  patches, screenshots, and logs. Redact Wi-Fi names, addresses, and account
  details where they are not needed to reproduce the issue.

For a suspected vulnerability, use GitHub's private vulnerability reporting
if the repository enables it. Otherwise request a private contact route from
a maintainer without posting sensitive details or exploit data publicly.
