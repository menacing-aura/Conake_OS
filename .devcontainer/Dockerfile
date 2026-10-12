FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        clang \
        cmake \
        curl \
        debian-archive-keyring \
        file \
        git \
        git-lfs \
        grub-common \
        grub-efi-amd64-bin \
        grub-pc-bin \
        live-build \
        make \
        mtools \
        nasm \
        novnc \
        pkg-config \
        python3 \
        qemu-system-x86 \
        qemu-utils \
        rustc \
        cargo \
        shellcheck \
        squashfs-tools \
        websockify \
        xorriso \
        xz-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*