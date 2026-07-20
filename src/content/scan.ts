import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { normalizeRelPath } from "./slugs.js";

/** Directories that are never part of the published vault. */
const IGNORED_DIRECTORIES = new Set([".obsidian", ".trash", ".git", "node_modules"]);

export interface ScannedMarkdown {
  absPath: string;
  relPath: string;
  raw: string;
  mtimeMs: number;
}

export interface ScannedAttachment {
  absPath: string;
  relPath: string;
}

export interface ScanResult {
  markdown: ScannedMarkdown[];
  attachments: ScannedAttachment[];
}

/**
 * Walk the content directory, reading every markdown file and recording every
 * other file as an attachment. Dot-prefixed entries are skipped entirely;
 * `_`-prefixed entries are scanned but blocked later by the publish gate.
 */
export async function scanVault(contentDirAbs: string): Promise<ScanResult> {
  const markdown: ScannedMarkdown[] = [];
  const attachments: ScannedAttachment[] = [];

  async function walk(dirAbs: string, relPrefix: string): Promise<void> {
    const entries = await readdir(dirAbs, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const absPath = join(dirAbs, entry.name);
      const relPath = normalizeRelPath(
        relPrefix === "" ? entry.name : `${relPrefix}/${entry.name}`,
      );

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(absPath, relPath);
        continue;
      }
      // Follow file symlinks; skip directory symlinks (cycle safety).
      if (entry.isSymbolicLink()) {
        try {
          const stats = await stat(absPath);
          if (!stats.isFile()) continue;
        } catch {
          continue;
        }
      } else if (!entry.isFile()) {
        continue;
      }

      if (/\.md$/i.test(entry.name)) {
        const [raw, stats] = await Promise.all([readFile(absPath, "utf8"), stat(absPath)]);
        markdown.push({ absPath, relPath, raw, mtimeMs: stats.mtimeMs });
      } else {
        attachments.push({ absPath, relPath });
      }
    }
  }

  await walk(contentDirAbs, "");
  markdown.sort((a, b) => a.relPath.localeCompare(b.relPath));
  attachments.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { markdown, attachments };
}
