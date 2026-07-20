import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import pc from "picocolors";
import { ASSETS_DIR } from "../assets-dir.js";
import { bootSite, buildSearchIndex, type Site } from "../boot.js";
import type { ResolvedConfig } from "../config/schema.js";
import { createApp } from "../server/app.js";
import { paginate } from "../site/pagination.js";

export interface BuildResult {
  outDir: string;
  pages: number;
  attachments: number;
  searchAvailable: boolean;
  warnings: string[];
}

interface Route {
  /** Site path to request from the app (percent-encoded per segment). */
  request: string;
  /** Output file path relative to outDir. */
  file: string;
}

/** Render the whole site to static files under `config.build.outDir`. */
export async function exportSite(config: ResolvedConfig): Promise<BuildResult> {
  const outDir = resolve(config.build.outDir);
  assertSafeOutDir(outDir, config.contentDirAbs);

  const site = await bootSite(config);
  const app = createApp({ ...site });
  const warnings: string[] = [];

  await emptyDir(outDir);

  const referencedAttachments = new Set<string>();
  const routes = enumerateRoutes(site);

  for (const route of routes) {
    const response = await app.request(route.request);
    const html = await response.text();
    if (response.status >= 400) {
      warnings.push(`${route.request} returned ${response.status}`);
    }
    await writeSite(outDir, route.file, html);
    collectAttachments(html, referencedAttachments);
  }

  // 404 page at the output root (GitHub Pages / Netlify convention).
  const notFound = await app.request("/__qufox_missing__");
  await writeSite(outDir, "404.html", await notFound.text());

  await copyEngineAssets(outDir);
  const attachments = await copyAttachments(config.contentDirAbs, outDir, referencedAttachments);

  await buildSearchIndex(site);
  await site.search.writeTo(outDir);
  if (!site.search.available) {
    warnings.push("search index was not generated (pagefind unavailable)");
  }
  if (config.site.url === undefined) {
    warnings.push("site.url is not set — feeds and sitemap will be unavailable (v1.1)");
  }

  return {
    outDir,
    pages: routes.length + 1,
    attachments,
    searchAvailable: site.search.available,
    warnings,
  };
}

/** Enumerate every static route: home, posts, tags, archive, search, and pages. */
function enumerateRoutes(site: Site): Route[] {
  const routes: Route[] = [];
  const pageSize = site.config.feed.pageSize;

  // Home feed.
  routes.push({ request: "/", file: "index.html" });
  const homePages = paginate(site.index.posts.length, 1, pageSize)?.totalPages ?? 1;
  for (let n = 2; n <= homePages; n++) {
    routes.push({ request: `/page/${n}`, file: `page/${n}/index.html` });
  }

  // Posts.
  for (const slug of site.index.notes.keys()) {
    const note = site.index.notes.get(slug);
    if (note === undefined || !note.published) continue;
    routes.push({ request: `/${encodePath(slug)}`, file: `${slug}/index.html` });
  }

  // Tag index and per-tag feeds.
  routes.push({ request: "/tags", file: "tags/index.html" });
  for (const [tag, slugs] of site.index.tags) {
    const encoded = encodePath(tag);
    routes.push({ request: `/tags/${encoded}`, file: `tags/${tag}/index.html` });
    const tagPages = paginate(slugs.size, 1, pageSize)?.totalPages ?? 1;
    for (let n = 2; n <= tagPages; n++) {
      routes.push({
        request: `/tags/${encoded}/page/${n}`,
        file: `tags/${tag}/page/${n}/index.html`,
      });
    }
  }

  routes.push({ request: "/archive", file: "archive/index.html" });
  routes.push({ request: "/search", file: "search/index.html" });
  return routes;
}

const ATTACHMENT_PATTERN = /assets\/vault\/([^"'\s>)]+)/g;

function collectAttachments(html: string, into: Set<string>): void {
  for (const match of html.matchAll(ATTACHMENT_PATTERN)) {
    try {
      into.add(decodeURIComponent(match[1] ?? "").normalize("NFC"));
    } catch {
      // ignore malformed references
    }
  }
}

async function copyAttachments(
  contentDir: string,
  outDir: string,
  relPaths: Set<string>,
): Promise<number> {
  let copied = 0;
  for (const relPath of relPaths) {
    const source = resolve(contentDir, relPath);
    if (!source.startsWith(contentDir)) continue;
    const dest = join(outDir, "assets", "vault", relPath);
    try {
      await mkdir(dirname(dest), { recursive: true });
      await cp(source, dest);
      copied++;
    } catch {
      // A referenced file that no longer exists is skipped silently.
    }
  }
  return copied;
}

async function copyEngineAssets(outDir: string): Promise<void> {
  await cp(join(ASSETS_DIR, "design"), join(outDir, "assets", "design"), { recursive: true });
  await mkdir(join(outDir, "assets", "app"), { recursive: true });
  await cp(join(ASSETS_DIR, "engine.css"), join(outDir, "assets", "app", "engine.css"));
  // Client scripts, minus the live-reload helper (serve mode only).
  for (const script of ["theme.js", "search.js"]) {
    await cp(join(ASSETS_DIR, "client", script), join(outDir, "assets", "app", script));
  }
}

/** Empty a directory's contents without removing the directory itself (works on mount points). */
async function emptyDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  await Promise.all(entries.map((entry) => rm(join(dir, entry), { recursive: true, force: true })));
}

async function writeSite(outDir: string, file: string, contents: string): Promise<void> {
  const abs = join(outDir, file);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, contents);
}

function encodePath(slug: string): string {
  return slug
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function assertSafeOutDir(outDir: string, contentDir: string): void {
  if (outDir === contentDir || contentDir.startsWith(`${outDir}/`) || outDir === resolve("/")) {
    throw new Error(
      `Refusing to build into ${outDir}: it contains or equals the content directory.`,
    );
  }
}

export function printBuildSummary(result: BuildResult): void {
  console.log();
  console.log(
    `  ${pc.green("✓")} built ${pc.bold(String(result.pages))} pages to ${pc.cyan(result.outDir)}`,
  );
  console.log(
    `    ${result.attachments} attachments · search ${result.searchAvailable ? "enabled" : pc.yellow("disabled")}`,
  );
  for (const warning of result.warnings) {
    console.log(`    ${pc.yellow("!")} ${warning}`);
  }
  console.log();
}
