import { readFile, stat } from "node:fs/promises";
import { join, posix } from "node:path";
import type { ResolvedConfig } from "../config/schema.js";
import type { Attachment, Note, SiteIndex } from "../types.js";
import { isMediaTarget, parseNote } from "./note.js";
import { createPublishGate } from "./publish.js";
import { byPathSpecificity, resolveLinkTarget } from "./resolve.js";
import type { ScanResult } from "./scan.js";
import { relPathKey } from "./slugs.js";
import type { ChangeBatch } from "./watcher.js";

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

/** Remove a note from every lookup map (derived maps are rebuilt separately). */
export function unregisterNote(index: SiteIndex, note: Note): void {
  if (index.notes.get(note.slug) !== note) {
    if (index.notes.get(note.slug)?.relPath !== note.relPath) return;
  }
  index.notes.delete(note.slug);

  const key = relPathKey(note.relPath);
  if (index.byRelPath.get(key) === note.slug) index.byRelPath.delete(key);
  removeBasenameKey(index, posix.basename(key), key);
  if (posix.basename(key) === "index") {
    const folder = posix.basename(posix.dirname(key));
    if (folder !== "." && folder !== "") removeBasenameKey(index, folder, key);
  }
  for (const alias of note.aliases) {
    const aliasKey = alias.normalize("NFC").toLowerCase();
    if (index.byAlias.get(aliasKey) === note.slug) index.byAlias.delete(aliasKey);
  }
}

export interface AppliedChanges {
  changedSlugs: Set<string>;
  removedSlugs: Set<string>;
  /** True when list pages/navigation are stale (add/remove or metadata change). */
  structural: boolean;
  warnings: string[];
}

/**
 * Apply one watcher batch incrementally: re-parse only the touched files,
 * then re-resolve links and rebuild the derived maps (pure in-memory work).
 */
export async function applyVaultChanges(
  index: SiteIndex,
  config: IndexConfig & { contentDirAbs: string },
  batch: ChangeBatch,
): Promise<AppliedChanges> {
  const publishGate = createPublishGate(config.publish);
  const changedSlugs = new Set<string>();
  const removedSlugs = new Set<string>();
  const warnings: string[] = [];
  let structural = false;

  const removeNoteByRelPath = (relPath: string) => {
    const note = findNoteByRelPath(index, relPath);
    if (note !== undefined) {
      unregisterNote(index, note);
      removedSlugs.add(note.slug);
      structural = true;
    }
  };

  for (const [key, kind] of batch.paths) {
    if (kind === "unlinkDir") {
      const prefix = key; // trailing "/" included
      for (const note of [...index.notes.values()]) {
        if (note.relPath.startsWith(prefix)) {
          unregisterNote(index, note);
          removedSlugs.add(note.slug);
          structural = true;
        }
      }
      for (const [basename, bucket] of [...index.attachments]) {
        const remaining = bucket.filter((attachment) => !attachment.relPath.startsWith(prefix));
        if (remaining.length === 0) index.attachments.delete(basename);
        else if (remaining.length !== bucket.length) index.attachments.set(basename, remaining);
      }
      continue;
    }

    const relPath = key;
    const isMarkdown = /\.md$/i.test(relPath);

    if (kind === "unlink") {
      if (isMarkdown) removeNoteByRelPath(relPath);
      else removeAttachment(index, relPath);
      continue;
    }

    // add or change
    if (!isMarkdown) {
      upsertAttachment(index, {
        absPath: join(config.contentDirAbs, relPath),
        relPath,
      });
      continue;
    }

    const absPath = join(config.contentDirAbs, relPath);
    let raw: string;
    let mtimeMs: number;
    try {
      [raw, mtimeMs] = await Promise.all([
        readFile(absPath, "utf8"),
        stat(absPath).then((s) => s.mtimeMs),
      ]);
    } catch {
      removeNoteByRelPath(relPath);
      continue;
    }

    const old = findNoteByRelPath(index, relPath);
    const { note, warnings: noteWarnings } = parseNote(
      { absPath, relPath, raw, mtimeMs },
      publishGate,
    );
    warnings.push(...noteWarnings);

    if (old !== undefined) unregisterNote(index, old);
    const registered = registerNote(index, note);
    if (!registered) {
      if (old !== undefined) removedSlugs.add(old.slug);
      structural = true;
      continue;
    }

    changedSlugs.add(note.slug);
    if (old === undefined) {
      structural = true;
    } else {
      if (old.slug !== note.slug) {
        removedSlugs.add(old.slug);
        structural = true;
      }
      if (
        old.title !== note.title ||
        old.date.getTime() !== note.date.getTime() ||
        old.published !== note.published ||
        old.excerpt !== note.excerpt ||
        old.tags.join("\n") !== note.tags.join("\n")
      ) {
        structural = true;
      }
    }
  }

  resolveAllLinks(index);
  rebuildDerived(index);
  index.revision += 1;

  return { changedSlugs, removedSlugs, structural, warnings };
}

/** Changed slugs plus every note transcluding them (transitively). */
export function collectInvalidations(index: SiteIndex, slugs: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const queue = [...slugs];
  while (queue.length > 0) {
    const slug = queue.pop();
    if (slug === undefined || out.has(slug)) continue;
    out.add(slug);
    if (out.size > 500) break;
    for (const parent of index.embeddedBy.get(slug) ?? []) {
      if (!out.has(parent)) queue.push(parent);
    }
  }
  return out;
}

function findNoteByRelPath(index: SiteIndex, relPath: string): Note | undefined {
  const slug = index.byRelPath.get(relPathKey(relPath));
  if (slug === undefined) return undefined;
  const note = index.notes.get(slug);
  return note !== undefined && note.relPath === relPath.normalize("NFC") ? note : undefined;
}

function upsertAttachment(index: SiteIndex, attachment: Attachment): void {
  const basename = posix.basename(attachment.relPath).toLowerCase();
  const bucket = index.attachments.get(basename) ?? [];
  if (!bucket.some((existing) => existing.relPath === attachment.relPath)) {
    bucket.push(attachment);
    bucket.sort((a, b) => byPathSpecificity(a.relPath, b.relPath));
    index.attachments.set(basename, bucket);
  }
}

function removeAttachment(index: SiteIndex, relPath: string): void {
  const basename = posix.basename(relPath).toLowerCase();
  const bucket = index.attachments.get(basename);
  if (bucket === undefined) return;
  const remaining = bucket.filter((attachment) => attachment.relPath !== relPath);
  if (remaining.length === 0) index.attachments.delete(basename);
  else index.attachments.set(basename, remaining);
}

function removeBasenameKey(index: SiteIndex, basename: string, relKey: string): void {
  const bucket = index.byBasename.get(basename);
  if (bucket === undefined) return;
  const remaining = bucket.filter((key) => key !== relKey);
  if (remaining.length === 0) index.byBasename.delete(basename);
  else index.byBasename.set(basename, remaining);
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
