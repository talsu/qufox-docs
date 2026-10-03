---
"qufox-docs": patch
---

Serve the design system's brand fonts (Geist Mono for code, Space Grotesk for Latin
headings and text) from the engine. Until now no font was loaded, so code fell back
to the system's generic monospace — on Korean Windows a wide CJK face that made code
blocks and inline code look heavy and loosely spaced. The fonts are vendored (Latin
subset, SIL OFL), so sites still make no third-party requests.
