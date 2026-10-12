# Development

Use the GitHub Codespaces configuration in `.devcontainer/` or install the
equivalent Debian Live build tools locally. Run `./scripts/build.sh` to create
`dist/conake-os-v0.1-amd64.iso`; its executable build tree is kept in
`~/.cache/conake-os/` for Codespaces compatibility. Run `./scripts/run.sh` to
boot the image in QEMU and open the noVNC desktop on forwarded port 6080.
`./scripts/clean.sh` removes generated build state and ISO output.

GitHub Actions builds on pushes to `main`, pull requests, and manual dispatch.
Download the ISO from the workflow's `conake-os-iso` artifact.