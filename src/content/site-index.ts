import { posix } from "node:path";
import type { ResolvedConfig } from "../config/schema.js";
import type { Note, SiteIndex } from "../types.js";
import { isMediaTarget, parseNote } from "./note.js";
import { createPublishGate } from "./publish.js";
import { byPathSpecificity, resolveLinkTarget } from "./resolve.js";
import type { ScanResult } from "./scan.js";
import { relPathKey } from "./slugs.js";

export type IndexConfig = Pick<ResolvedConfig, "publish">;

/** Build the full in-memory index from a vault scan. */
export function buildSiteIndex(scan: ScanResult, config: IndexConfig): SiteIndex {
  const warnings: string[] = [];
  const publishGate = createPublishGate(config.publish);

  const index: SiteIndex = {
    notes: new Map(),
    byRelPath: new Map(),
    byBasename: new Map(),
    byAlias: new Map(),
    attachments: new Map(),
    tags: new Map(),
    backlinks: new Map(),
    embeddedBy: new Map(),
    posts: [],
    revision: 0,
    warnings,
  };

  for (const file of scan.markdown) {
    const { note, warnings: noteWarnings } = parseNote(file, publishGate);
    warnings.push(...noteWarnings);
    registerNote(index, note);
  }

  for (const attachment of scan.attachments) {
    const basename = posix.basename(attachment.relPath).toLowerCase();
    const bucket = index.attachments.get(basename) ?? [];
    bucket.push(attachment);
    index.attachments.set(basename, bucket);
  }
  for (const bucket of index.attachments.values()) {
    bucket.sort((a, b) => byPathSpecificity(a.relPath, b.relPath));
  }

  resolveAllLinks(index);
  rebuildDerived(index);
  return index;
}

/** Insert a parsed note into the lookup maps. Returns false on slug collision. */
export function registerNote(index: SiteIndex, note: Note): boolean {
  if (note.slug === "") {
    index.warnings.push(
      `${note.relPath}: a root index.md would collide with the home feed and is skipped`,
    );
    return false;
  }
  const existing = index.notes.get(note.slug);
  if (existing !== undefined) {
    index.warnings.push(
      `${note.relPath}: slug "${note.slug}" already used by ${existing.relPath}; skipping this file`,
    );
    return false;
  }

  index.notes.set(note.slug, note);

  const key = relPathKey(note.relPath);
  index.byRelPath.set(key, note.slug);
  addBasenameKey(index, posix.basename(key), key);
  // Folder indexes are also reachable by their folder name: [[guides]].
  if (posix.basename(key) === "index") {
    const folder = posix.basename(posix.dirname(key));
    if (folder !== "." && folder !== "") addBasenameKey(index, folder, key);
  }

  for (const alias of note.aliases) {
    const aliasKey = alias.normalize("NFC").toLowerCase();
    const current = index.byAlias.get(aliasKey);
    if (current !== undefined && current !== note.slug) {
      index.warnings.push(
        `${note.relPath}: alias "${alias}" already points to "${current}"; keeping the first`,
      );
      continue;
    }
    index.byAlias.set(aliasKey, note.slug);
  }
  return true;
}

function addBasenameKey(index: SiteIndex, basename: string, relKey: string): void {
  const bucket = index.byBasename.get(basename) ?? [];
  if (!bucket.includes(relKey)) bucket.push(relKey);
  index.byBasename.set(basename, bucket);
}

/** Resolve every note's raw wikilinks against the completed lookup maps. */
export function resolveAllLinks(index: SiteIndex): void {
  for (const note of index.notes.values()) {
    const outbound = new Set<string>();
    const embeds = new Set<string>();
    const unresolved: string[] = [];

    for (const link of note.rawLinks) {
      if (link.embed && isMediaTarget(link.target)) continue;
      const target = resolveLinkTarget(index, note.relPath, link.target);
      if (target.kind === "note") {
        if (target.slug !== note.slug) outbound.add(target.slug);
        if (link.embed) embeds.add(target.slug);
      } else if (target.kind === "unresolved") {
        unresolved.push(link.target);
      }
    }

    note.outboundLinks = [...outbound];
    note.embeds = [...embeds];
    note.unresolvedLinks = unresolved;
  }
}

/** Rebuild tags, backlinks, embeddedBy, and the sorted post list. */
export function rebuildDerived(index: SiteIndex): void {
  index.tags.clear();
  index.backlinks.clear();
  index.embeddedBy.clear();

  const published = [...index.notes.values()].filter((note) => note.published);

  for (const note of published) {
    for (const tag of note.tags) {
      const bucket = index.tags.get(tag) ?? new Set<string>();
      bucket.add(note.slug);
      index.tags.set(tag, bucket);
    }
    for (const target of note.outboundLinks) {
      const bucket = index.backlinks.get(target) ?? new Set<string>();
      bucket.add(note.slug);
      index.backlinks.set(target, bucket);
    }
    for (const target of note.embeds) {
      const bucket = index.embeddedBy.get(target) ?? new Set<string>();
      bucket.add(note.slug);
      index.embeddedBy.set(target, bucket);
    }
  }

  index.posts = published
    .sort((a, b) => {
      const aFrontmatter = a.dateSource === "frontmatter";
      const bFrontmatter = b.dateSource === "frontmatter";
      if (aFrontmatter !== bFrontmatter) return aFrontmatter ? -1 : 1;
      const diff = b.date.getTime() - a.date.getTime();
      return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
    })
    .map((note) => note.slug);
}
