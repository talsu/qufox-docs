---
"qufox-docs": patch
---

Upgrade the vendored qufox design system to v0.6.2 and drop the engine-side
bridge styles it now handles natively:

- Load the new `icons.css` and rely on the sprite's baked paint, removing the
  `.qf-icon` outline-paint bridge.
- Widen article bodies via the DS `--qf-prose-max` override token instead of
  forcing `max-width: none`.
- Remove the `.qf-table-wrap` sizing, `.qf-drawer[hidden]`, and structural-link
  color bridges — the design system now ships equivalents.
