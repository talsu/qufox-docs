import { posix } from "node:path";
import type { Attachment, Note, SiteIndex } from "../types.js";
import { normalizeRelPath, relPathKey, stripMarkdownExt } from "./slugs.js";

export type LinkTarget =
  | { kind: "note"; slug: string; fragment: string | null }
  | { kind: "anchor"; fragment: string }
  | { kind: "unresolved"; raw: string };

export function splitTarget(raw: string): { base: string; fragment: string | null } {
  const hashIndex = raw.indexOf("#");
  if (hashIndex === -1) return { base: raw.trim(), fragment: null };
  const fragment = raw.slice(hashIndex + 1).trim();
  return { base: raw.slice(0, hashIndex).trim(), fragment: fragment === "" ? null : fragment };
}

/**
 * Resolve a wikilink target the way Obsidian does: vault-absolute path first,
 * then relative to the linking note, then unique-enough basename (shortest
 * path wins ties), then aliases.
 */
export function resolveLinkTarget(index: SiteIndex, fromRelPath: string, raw: string): LinkTarget {
  const { base, fragment } = splitTarget(raw);
  if (base === "") {
    return fragment !== null ? { kind: "anchor", fragment } : { kind: "unresolved", raw };
  }

  const cleaned = relPathKey(base).replace(/^\.\//, "");

  const absolute = index.byRelPath.get(cleaned);
  if (absolute !== undefined) return { kind: "note", slug: absolute, fragment };

  const fromDir = posix.dirname(relPathKey(fromRelPath));
  const relativeKey = posix.normalize(posix.join(fromDir === "." ? "" : fromDir, cleaned));
  const relative = index.byRelPath.get(relativeKey);
  if (relative !== undefined) return { kind: "note", slug: relative, fragment };

  const candidates = index.byBasename.get(posix.basename(cleaned)) ?? [];
  const matching = cleaned.includes("/")
    ? candidates.filter((key) => key === cleaned || key.endsWith(`/${cleaned}`))
    : candidates;
  if (matching.length > 0) {
    const best = [...matching].sort(byPathSpecificity)[0];
    const slug = best !== undefined ? index.byRelPath.get(best) : undefined;
    if (slug !== undefined) return { kind: "note", slug, fragment };
  }

  const aliased = index.byAlias.get(cleaned);
  if (aliased !== undefined) return { kind: "note", slug: aliased, fragment };

  return { kind: "unresolved", raw };
}

/** Fewest path segments first, then lexicographic — deterministic ambiguity handling. */
export function byPathSpecificity(a: string, b: string): number {
  const depthDiff = a.split("/").length - b.split("/").length;
  return depthDiff !== 0 ? depthDiff : a.localeCompare(b);
}

/**
 * Reproduce the anchor id for `[[note#Heading]]` / `[[note#^block]]` against
 * the target note's headings, matching the rendered ids (github-slugger,
 * duplicate suffixes included).
 */
export function resolveFragmentAnchor(target: Note, fragment: string): string | null {
  const segments = fragment
    .split("#")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
  const last = segments[segments.length - 1];
  if (last === undefined) return null;
  if (last.startsWith("^")) return `block-${last.slice(1)}`;

  const wanted = last.toLowerCase();
  const match = target.headings.find((heading) => heading.text.toLowerCase() === wanted);
  return match?.id ?? null;
}

/** Resolve `![[image.png]]`-style attachment references by basename. */
export function resolveAttachment(index: SiteIndex, raw: string): Attachment | null {
  const cleaned = normalizeRelPath(raw.trim()).toLowerCase().replace(/^\.\//, "");
  const candidates = index.attachments.get(posix.basename(cleaned)) ?? [];
  const matching = cleaned.includes("/")
    ? candidates.filter(
        (attachment) =>
          attachment.relPath.toLowerCase() === cleaned ||
          attachment.relPath.toLowerCase().endsWith(`/${cleaned}`),
      )
    : candidates;
  if (matching.length === 0) return null;
  return [...matching].sort((a, b) => byPathSpecificity(a.relPath, b.relPath))[0] ?? null;
}

export { stripMarkdownExt };
