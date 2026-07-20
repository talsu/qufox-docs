import { posix } from "node:path";
import type { NoteFrontmatter } from "../types.js";

export function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}

/** Canonical form for vault-relative paths: posix separators, NFC unicode. */
export function normalizeRelPath(path: string): string {
  return toPosixPath(path).normalize("NFC");
}

export function stripMarkdownExt(relPath: string): string {
  return relPath.replace(/\.md$/i, "");
}

/** Lookup key for byRelPath/byBasename maps. */
export function relPathKey(relPath: string): string {
  return stripMarkdownExt(normalizeRelPath(relPath)).toLowerCase();
}

/**
 * Derive the URL slug for a note.
 *
 * - `permalink` frontmatter overrides the whole path.
 * - `slug` frontmatter overrides the filename segment.
 * - `index.md` folds onto its folder ("guides/index.md" → "guides").
 */
export function slugForNote(relPath: string, frontmatter: NoteFrontmatter): string {
  const permalink = typeof frontmatter.permalink === "string" ? frontmatter.permalink.trim() : "";
  if (permalink !== "") return trimSlashes(normalizeRelPath(permalink));

  const withoutExt = stripMarkdownExt(normalizeRelPath(relPath));
  const dirname = posix.dirname(withoutExt);
  const dir = dirname === "." ? "" : dirname;
  const base = posix.basename(withoutExt);

  const slugOverride = typeof frontmatter.slug === "string" ? frontmatter.slug.trim() : "";
  if (slugOverride !== "") {
    const cleaned = trimSlashes(normalizeRelPath(slugOverride));
    return dir === "" ? cleaned : `${dir}/${cleaned}`;
  }
  if (base.toLowerCase() === "index") return dir;
  return dir === "" ? base : `${dir}/${base}`;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}
