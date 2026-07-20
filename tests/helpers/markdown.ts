import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach } from "vitest";
import type { ScanResult } from "../../src/content/scan.js";
import { scanVault } from "../../src/content/scan.js";
import { buildSiteIndex } from "../../src/content/site-index.js";
import { MarkdownRenderer } from "../../src/markdown/pipeline.js";
import { ShikiService } from "../../src/markdown/shiki.js";
import { createHref } from "../../src/site/url.js";
import type { SiteIndex } from "../../src/types.js";

/** Build a SiteIndex from inline markdown sources for pipeline tests. */
export function indexFromFiles(
  files: Record<string, string>,
  attachments: string[] = [],
): SiteIndex {
  const scan: ScanResult = {
    markdown: Object.entries(files).map(([relPath, raw]) => ({
      absPath: `/vault/${relPath}`,
      relPath,
      raw,
      mtimeMs: 1_700_000_000_000,
    })),
    attachments: attachments.map((relPath) => ({ absPath: `/vault/${relPath}`, relPath })),
  };
  return buildSiteIndex(scan, { publish: { mode: "opt-out", exclude: [] } });
}

export async function makeRenderer(
  index: SiteIndex,
  options: { breaks?: boolean; basePath?: string } = {},
): Promise<MarkdownRenderer> {
  return new MarkdownRenderer(await ShikiService.create(), {
    breaks: options.breaks ?? true,
    index,
    href: createHref(options.basePath ?? "/"),
  });
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Write markdown files to a real temp directory and return a renderer bound to
 * its scanned index. Needed for transclusion, which reads embedded notes from
 * disk. The first key doubles as the default relPath to render.
 */
export async function tempVault(
  files: Record<string, string>,
): Promise<{ renderer: MarkdownRenderer; index: SiteIndex; dir: string; relPath: string }> {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "qufox-md-")));
  tempDirs.push(dir);
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = join(dir, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content);
  }
  const index = buildSiteIndex(await scanVault(dir), {
    publish: { mode: "opt-out", exclude: [] },
  });
  const renderer = await makeRenderer(index);
  return { renderer, index, dir, relPath: Object.keys(files)[0] ?? "" };
}
