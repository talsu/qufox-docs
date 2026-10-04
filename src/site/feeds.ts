import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ResolvedConfig } from "../config/schema.js";
import type { Note, SiteIndex } from "../types.js";
import type { Href } from "./url.js";

/** Site paths of the machine-readable outputs. */
export const FEED_PATH = "feed.xml";
export const SITEMAP_PATH = "sitemap.xml";
export const ROBOTS_PATH = "robots.txt";

/** Absolute URL of a site path, or null when `site.url` is not configured. */
export function absoluteUrl(config: ResolvedConfig, href: Href, path: string): string | null {
  if (config.site.url === undefined) return null;
  return new URL(href(path), config.site.url).href;
}

/** RSS 2.0 feed of the newest posts. Null when `site.url` is not configured. */
export function renderFeed(config: ResolvedConfig, index: SiteIndex, href: Href): string | null {
  const home = absoluteUrl(config, href, "");
  const self = absoluteUrl(config, href, FEED_PATH);
  if (home === null || self === null) return null;

  const notes = publishedPosts(index).slice(0, config.feed.limit);
  const newest = notes[0]?.date;
  const items = notes.map((note) => {
    const link = absoluteUrl(config, href, note.slug) ?? "";
    return [
      "    <item>",
      `      <title>${escapeXml(note.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${note.date.toUTCString()}</pubDate>`,
      ...(note.excerpt !== ""
        ? [`      <description>${escapeXml(note.excerpt)}</description>`]
        : []),
      ...note.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(config.site.title)}</title>`,
    `    <link>${escapeXml(home)}</link>`,
    `    <description>${escapeXml(config.site.description)}</description>`,
    `    <language>${escapeXml(config.site.locale)}</language>`,
    `    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>`,
    ...(newest !== undefined ? [`    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>`] : []),
    `    <generator>qufox-docs ${escapeXml(config.engineVersion)}</generator>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** XML sitemap of the home page and every published post. Null without `site.url`. */
export function renderSitemap(config: ResolvedConfig, index: SiteIndex, href: Href): string | null {
  const home = absoluteUrl(config, href, "");
  if (home === null) return null;

  const urls = [`  <url><loc>${escapeXml(home)}</loc></url>`];
  for (const note of publishedPosts(index)) {
    const loc = absoluteUrl(config, href, note.slug) ?? "";
    // Only an authored date says when the content last changed; mtime does not survive a clone.
    const lastmod =
      note.dateSource === "frontmatter"
        ? `<lastmod>${note.date.toISOString().slice(0, 10)}</lastmod>`
        : "";
    urls.push(`  <url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * robots.txt. A `robots.txt` at the root of the content folder is the site's
 * own policy and is served as written; otherwise everything is allowed and the
 * sitemap, when there is one, is announced.
 */
export async function renderRobots(config: ResolvedConfig, href: Href): Promise<string> {
  try {
    return await readFile(join(config.contentDirAbs, ROBOTS_PATH), "utf8");
  } catch {
    // no site-provided file
  }
  const sitemap = absoluteUrl(config, href, SITEMAP_PATH);
  return [
    "User-agent: *",
    "Allow: /",
    ...(sitemap !== null ? ["", `Sitemap: ${sitemap}`] : []),
    "",
  ].join("\n");
}

function publishedPosts(index: SiteIndex): Note[] {
  return index.posts
    .map((slug) => index.notes.get(slug))
    .filter((note): note is Note => note !== undefined);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
