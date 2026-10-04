import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import pc from "picocolors";
import { ASSETS_DIR } from "../assets-dir.js";
import { bootSite, type Site } from "../boot.js";
import type { ResolvedConfig } from "../config/schema.js";
import { createApp } from "../server/app.js";
import {
  FEED_PATH,
  ROBOTS_PATH,
  renderFeed,
  renderRobots,
  renderSitemap,
  SITEMAP_PATH,
} from "../site/feeds.js";
import { paginate } from "../site/pagination.js";
import { buildRedirectTable } from "../site/redirects.js";
import { siteHref } from "../site/url.js";

export interface BuildResult {
  outDir: string;
  pages: number;
  attachments: number;
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

  const href = siteHref(config);
  const feed = renderFeed(config, site.index, href);
  const sitemap = renderSitemap(config, site.index, href);
  if (feed !== null) await writeSite(outDir, FEED_PATH, feed);
  if (sitemap !== null) await writeSite(outDir, SITEMAP_PATH, sitemap);
  await writeSite(outDir, ROBOTS_PATH, await renderRobots(config, href));
  if (config.site.url === undefined) {
    warnings.push("site.url is not set — the feed and sitemap were not written");
  }

  const redirects = await writeRedirectStubs(site, outDir, routes, warnings);

  return {
    outDir,
    pages: routes.length + 1 + redirects,
    attachments,
    warnings,
  };
}

/** Enumerate every static route: home (paginated), posts, tags, archive, browse. */
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
  routes.push({ request: "/browse", file: "browse/index.html" });
  return routes;
}

/**
 * A static host cannot answer with a 301, so each path redirect becomes a stub
 * page that forwards the browser. Redirects keyed on a query string or a
 * subtree need a server and are reported instead.
 */
async function writeRedirectStubs(
  site: Site,
  outDir: string,
  routes: Route[],
  warnings: string[],
): Promise<number> {
  const table = buildRedirectTable(site.index, site.config, siteHref(site.config), (message) =>
    warnings.push(message),
  );
  const taken = new Set(routes.map((route) => route.file));
  let written = 0;
  let skipped = table.splats.length;

  for (const [path, rules] of table.exact) {
    const rule = rules.find((candidate) => candidate.query.length === 0);
    skipped += rules.length - (rule === undefined ? 0 : 1);
    if (rule === undefined) continue;
    const file = `${path.replace(/^\/+/, "")}/index.html`.replace(/^\//, "");
    if (taken.has(file)) continue;
    await writeSite(outDir, file, redirectStub(rule.to));
    written++;
  }
  if (skipped > 0) {
    warnings.push(
      `${skipped} redirect(s) match on a query string or a subtree and only work with "qufox-docs serve"`,
    );
  }
  return written;
}

function redirectStub(target: string): string {
  const escaped = target.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return (
    `<!doctype html><meta charset="utf-8"><title>Redirecting…</title>` +
    `<link rel="canonical" href="${escaped}"><meta http-equiv="refresh" content="0; url=${escaped}">` +
    `<a href="${escaped}">Redirecting…</a>\n`
  );
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
  await cp(join(ASSETS_DIR, "fonts"), join(outDir, "assets", "fonts"), { recursive: true });
  await mkdir(join(outDir, "assets", "app"), { recursive: true });
  await cp(join(ASSETS_DIR, "engine.css"), join(outDir, "assets", "app", "engine.css"));
  // Client scripts, minus the live-reload helper (serve mode only).
  await cp(join(ASSETS_DIR, "client", "theme.js"), join(outDir, "assets", "app", "theme.js"));
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
  console.log(`    ${result.attachments} attachments`);
  for (const warning of result.warnings) {
    console.log(`    ${pc.yellow("!")} ${warning}`);
  }
  console.log();
}
