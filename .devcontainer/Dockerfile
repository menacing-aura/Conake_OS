FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive
ARG LIVE_BUILD_VERSION=20250505+deb13u1

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
    && curl --fail --silent --show-error --location \
        "https://deb.debian.org/debian/pool/main/l/live-build/live-build_${LIVE_BUILD_VERSION}_all.deb" \
        --output "/tmp/live-build_${LIVE_BUILD_VERSION}_all.deb" \
    && dpkg -i "/tmp/live-build_${LIVE_BUILD_VERSION}_all.deb" \
    && test "$(dpkg-query -W -f='${Version}\n' live-build)" = "1:${LIVE_BUILD_VERSION}" \
    && apt-get -f install -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* "/tmp/live-build_${LIVE_BUILD_VERSION}_all.deb"