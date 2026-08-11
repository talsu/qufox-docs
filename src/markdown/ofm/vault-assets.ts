import type { Root } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { resolveAttachment } from "../../content/resolve.js";
import { getRenderContext, type RenderContext } from "./context.js";

// Absolute URLs, protocol/protocol-relative, root-absolute paths, and bare anchors.
export const NON_RELATIVE = /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i;

/**
 * Resolve a vault-relative media reference (e.g. `img/photo.png`) to the served
 * asset URL, or null when it is absolute, external, or matches no attachment.
 */
export function vaultAssetUrl(context: RenderContext, rawUrl: string): string | null {
  if (rawUrl === "" || NON_RELATIVE.test(rawUrl)) return null;

  let decoded = rawUrl;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    // keep the raw value if it is not valid percent-encoding
  }

  const attachment = resolveAttachment(context.index, decoded);
  if (attachment === null) return null;
  return context.href(`assets/vault/${attachment.relPath}`);
}

/** Media attributes carrying a URL, per element. */
const MEDIA_ATTRIBUTES: Record<string, readonly string[]> = {
  img: ["src"],
  source: ["src"],
  video: ["src", "poster"],
  audio: ["src"],
};

/**
 * Rewrite vault-relative media URLs written as raw HTML — `<img src="img/a.png">`,
 * `<video src="clip.mp4" poster="thumb.jpg">` — to the served asset route, the
 * same way `![alt](img/a.png)` and `![[a.png]]` resolve. Obsidian resolves these
 * against the note's folder, so notes that use HTML for layout (images inside a
 * table, sized thumbnails) would otherwise render broken on the site.
 *
 * Runs in the hast phase because raw HTML only becomes elements after
 * `rehype-raw`. Markdown-authored images arrive already resolved and are skipped
 * by the absolute-URL guard.
 */
export function rehypeVaultAssets() {
  return (tree: Root, file: VFile) => {
    const context = getRenderContext(file);

    visit(tree, "element", (node) => {
      const attributes = MEDIA_ATTRIBUTES[node.tagName];
      if (attributes === undefined) return;

      for (const attribute of attributes) {
        const value = node.properties[attribute];
        if (typeof value !== "string") continue;
        const resolved = vaultAssetUrl(context, value);
        if (resolved !== null) node.properties[attribute] = resolved;
      }
    });
  };
}
