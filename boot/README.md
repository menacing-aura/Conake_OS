# Boot image

`live-build/config/package-lists/` defines the Debian packages in the image.
The build script initializes this configuration for Debian stable (`trixie`)
and stages the contents of `system/`, `apps/`, and `assets/` into its live root.