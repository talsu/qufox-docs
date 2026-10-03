import { resolveAttachment } from "../content/resolve.js";
import type { Note, SiteIndex } from "../types.js";
import type { Href } from "./url.js";

/**
 * Site URL of a note's lead image, or null when it has none or the reference
 * matches no attachment. Absolute URLs pass through untouched.
 */
export function noteImageUrl(note: Note, index: SiteIndex, href: Href): string | null {
  const raw = note.image;
  if (raw === undefined) return null;
  if (/^(https?:)?\/\//i.test(raw)) return raw;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // not percent-encoded; use as written
  }
  const attachment = resolveAttachment(index, decoded);
  return attachment === null ? null : href(`assets/vault/${attachment.relPath}`);
}
