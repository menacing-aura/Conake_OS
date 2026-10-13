# Development

Use the GitHub Codespaces configuration in `.devcontainer/` or install the
equivalent Debian Live build tools locally. Run `./scripts/build.sh` to create
`dist/conake-os-v0.1-amd64.iso`; its executable build tree is kept in
`~/.cache/conake-os/` for Codespaces compatibility. Run `./scripts/run.sh` to
boot the image in QEMU and open the noVNC desktop on forwarded port 6080.
`./scripts/clean.sh` removes generated build state and ISO output.

GitHub Actions builds on pushes to `main` and `conake-os`, pull requests, and
manual dispatch. Validate ISO changes on `conake-os` before merging them into
`main`. CI invokes the build script through Bash, including its sudo handoff,
so the build does not depend on the script's executable bit. The workflow uses
Debian Trixie live-build `1:20250505+deb13u1`.
Download the ISO from the workflow's `conake-os-iso` artifact.
