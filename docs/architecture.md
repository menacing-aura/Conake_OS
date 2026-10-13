# v0.1 architecture

Conake OS is assembled as a Debian Live system. `boot/live-build/` describes
the ISO package set, while the build script stages `system/`, `apps/`, and
`assets/` into the live root filesystem. Debian supplies the kernel, init
system, and hardware support; XFCE provides the initial desktop.

At boot, `conake-memory-profile.service` reads `MemTotal` and records the
selected profile in `/run/conake/memory-profile`. It sets the zRAM percentage
before `zramswap.service` starts. The initial policy uses 100% for under 2 GB,
75% for 2-4 GB, 50% for 4-8 GB, and 25% for 8 GB or more. The ultra-light
profile also disables optional print services if present; network and desktop
services remain untouched. `earlyoom` starts after the memory profile and
zRAM, and acts only when both available RAM and swap fall below 5%. It can
terminate a process under severe memory pressure; it does not selectively
unload individual browser tabs.

The live image uses compressed zRAM swap. A persistent disk swapfile and
installer are intentionally out of scope for v0.1.