# Applications

Conake applications live here as independent components. v0.1 ships the
welcome screen in `welcome/` and the Conake Browser launcher in `browser/`.
The browser currently uses Debian's Firefox ESR package; its desktop entry is
branded for Conake while keeping the underlying browser independently
replaceable. Later apps can add their own packaging and desktop integration
without coupling them to the desktop shell.