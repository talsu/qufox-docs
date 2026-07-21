---
"qufox-docs": minor
---

Add a brand and theme picker to the navbar: switch the design-system brand
accent (qufox, ocean, forest, amber, rose) and the light/dark theme, both
persisted to localStorage. The initial theme is now **light** with the **qufox**
brand; override with `theme.default` / `theme.brand` in the config or the
`QUFOX_THEME` / `QUFOX_BRAND` environment variables.
