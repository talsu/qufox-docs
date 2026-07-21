import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Absolute path of the engine's bundled static assets. Works from both src/
 * (dev, vitest) and dist/ (published build) because `src/assets` is copied to
 * `dist/assets` and this module sits next to the folder in both trees.
 */
export const ASSETS_DIR: string = fileURLToPath(new URL("assets", import.meta.url));

/** Pinned design-system version (see scripts/sync-design.mjs). */
export const DS_VERSION: string = readFileSync(
  new URL("assets/design/VERSION", import.meta.url),
  "utf8",
).trim();

/**
 * The design system icon sprite, inlined at the top of every page so
 * `<use href="#qf-i-…">` references resolve (the XML prolog is stripped for
 * embedding in HTML).
 */
export const ICONS_SPRITE: string = readFileSync(
  new URL("assets/design/icons.svg", import.meta.url),
  "utf8",
)
  .replace(/<\?xml[^?]*\?>\s*/, "")
  .trim();
