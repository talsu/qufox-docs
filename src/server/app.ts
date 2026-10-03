import { type Context, Hono } from "hono";
import pc from "picocolors";
import type { ResolvedConfig } from "../config/schema.js";
import type { Renderer } from "../render/renderer.js";
import {
  FEED_PATH,
  ROBOTS_PATH,
  renderFeed,
  renderRobots,
  renderSitemap,
  SITEMAP_PATH,
} from "../site/feeds.js";
import { ArchivePage } from "../site/pages/archive.js";
import { BrowsePage } from "../site/pages/browse.js";
import { HomePage } from "../site/pages/home.js";
import { NotFoundPage } from "../site/pages/not-found.js";
import { PostPage } from "../site/pages/post.js";
import { TagPage } from "../site/pages/tag.js";
import { TagsPage } from "../site/pages/tags.js";
import { paginate } from "../site/pagination.js";
import { buildRedirectTable, matchRedirect, type RedirectTable } from "../site/redirects.js";
import { siteHref, slugFromPathname } from "../site/url.js";
import type { SiteIndex } from "../types.js";
import { serveEngineAsset, serveVaultAsset } from "./assets.js";
import type { LiveReloadHub } from "./livereload.js";

export interface AppContext {
  config: ResolvedConfig;
  index: SiteIndex;
  renderer: Renderer;
  livereload?: LiveReloadHub | undefined;
}

/** Build the Hono app serving the site (used by `serve`; `build` renders directly). */
export function createApp(context: AppContext): Hono {
  const { config, index, renderer } = context;
  const href = siteHref(config);
  const page = { config, href };
  const pageSize = config.feed.pageSize;

  const app = new Hono();

  if (context.livereload !== undefined) {
    app.get("/__qufox/events", context.livereload.handler);
  }

  // Legacy URLs that differ only by query string ("/?p=123") share a path with
  // a live page, so they are matched before routing. Path redirects never
  // shadow a live page: they are tried once nothing else answered (notFound).
  app.use("*", async (c, next) => {
    const search = new URL(c.req.url).search;
    if (search.length > 1) {
      const target = matchRedirect(redirectTable(), c.req.path, search, { queryOnly: true });
      if (target !== null) return c.redirect(target, 301);
    }
    await next();
  });

  // Home feed and its pages.
  app.get("/", (c) => renderHome(c, 1));
  app.get("/page/:n", (c) => renderHome(c, Number(c.req.param("n"))));

  function renderHome(c: Context, pageNum: number) {
    if (pageNum === 1 && c.req.path !== "/") return c.redirect(href(""), 301);
    const slice = paginate(index.posts.length, pageNum, pageSize);
    if (slice === null) return notFound(c);
    return listResponse(c, `home-${pageNum}`, HomePage({ index, slice, ...page }));
  }

  // Tag index and per-tag feeds (tags may be nested, e.g. /tags/inbox/to-read).
  app.get("/tags", (c) => listResponse(c, "tags", TagsPage({ index, ...page })));
  app.get("/tags/*", (c) => {
    const rest = decodePath(c.req.path.slice("/tags/".length));
    if (rest === null) return notFound(c);
    const { tag, pageNum } = parseTagPath(rest);
    const slugs = orderedTagSlugs(index, tag);
    if (slugs === null) return notFound(c);
    const slice = paginate(slugs.length, pageNum, pageSize);
    if (slice === null) return notFound(c);
    const key = `tag-${encodeURIComponent(tag)}-${pageNum}`;
    return listResponse(c, key, TagPage({ index, tag, slugs, slice, ...page }));
  });

  app.get("/archive", (c) => listResponse(c, "archive", ArchivePage({ index, ...page })));

  app.get("/browse", (c) => listResponse(c, "browse", BrowsePage({ index, ...page })));

  // Machine-readable outputs. The feed and sitemap need absolute URLs (site.url).
  app.get(`/${FEED_PATH}`, (c) =>
    textResponse(c, renderFeed(config, index, href), "application/rss+xml; charset=utf-8"),
  );
  app.get(`/${SITEMAP_PATH}`, (c) =>
    textResponse(c, renderSitemap(config, index, href), "application/xml; charset=utf-8"),
  );
  app.get(`/${ROBOTS_PATH}`, (c) =>
    textResponse(c, renderRobots(config, href), "text/plain; charset=utf-8"),
  );
  app.get("/favicon.ico", (c) =>
    config.site.favicon !== undefined
      ? c.redirect(href(`assets/vault/${config.site.favicon}`), 302)
      : notFound(c),
  );

  // Assets.
  app.get("/assets/design/:file", (c) =>
    serveEngineAsset(c, `design/${c.req.param("file")}`, "immutable"),
  );
  app.get("/assets/fonts/:file", (c) =>
    serveEngineAsset(c, `fonts/${c.req.param("file")}`, "immutable"),
  );
  app.get("/assets/app/:file", (c) => {
    const file = c.req.param("file");
    return serveEngineAsset(c, file === "engine.css" ? file : `client/${file}`, "no-cache");
  });
  app.get("/assets/vault/*", (c) => {
    const decoded = decodePath(c.req.path.slice("/assets/vault/".length));
    if (decoded === null) return c.notFound();
    return serveVaultAsset(c, config, decoded);
  });

  // Post pages (catch-all, registered last).
  app.get("*", async (c) => {
    const slug = slugFromPathname(c.req.path, "/");
    if (slug === null || slug === "") return notFound(c);
    const note = index.notes.get(slug);
    if (note === undefined || !note.published) return notFound(c);

    const etag = `"${note.contentHash}-${index.revision}"`;
    if (c.req.header("if-none-match") === etag) return c.body(null, 304);

    const rendered = await renderer.render(note);
    c.header("ETag", etag);
    c.header("Cache-Control", "no-cache");
    return c.html(PostPage({ note, page: rendered, index, ...page }));
  });

  app.notFound((c) => notFound(c));

  function listResponse(c: Context, tag: string, body: Parameters<Context["html"]>[0]) {
    const etag = `"${tag}-${index.revision}"`;
    if (c.req.header("if-none-match") === etag) return c.body(null, 304);
    c.header("ETag", etag);
    c.header("Cache-Control", "no-cache");
    return c.html(body);
  }

  function textResponse(c: Context, body: string | null, contentType: string) {
    if (body === null) return notFound(c);
    c.header("Content-Type", contentType);
    c.header("Cache-Control", "no-cache");
    return c.body(body);
  }

  function notFound(c: Context) {
    const target = matchRedirect(redirectTable(), c.req.path, new URL(c.req.url).search);
    if (target !== null) return c.redirect(target, 301);
    return c.html(NotFoundPage(page), 404);
  }

  /** The redirect table follows the index: rebuilt after each applied change batch. */
  let redirects: { revision: number; table: RedirectTable } | undefined;
  function redirectTable(): RedirectTable {
    if (redirects === undefined || redirects.revision !== index.revision) {
      const table = buildRedirectTable(index, config, href, (message) =>
        console.warn(pc.yellow(`  ! ${message}`)),
      );
      redirects = { revision: index.revision, table };
    }
    return redirects.table;
  }

  return app;
}

/** Split a `/tags/...` remainder into the tag and optional `/page/N` suffix. */
export function parseTagPath(rest: string): { tag: string; pageNum: number } {
  const trimmed = rest.replace(/\/+$/, "");
  const match = trimmed.match(/^(.*)\/page\/(\d+)$/);
  if (match !== null) {
    return { tag: (match[1] ?? "").toLowerCase(), pageNum: Number(match[2]) };
  }
  return { tag: trimmed.toLowerCase(), pageNum: 1 };
}

/** Published slugs for a tag, in feed order (newest first). Null if the tag is unknown. */
function orderedTagSlugs(index: SiteIndex, tag: string): string[] | null {
  const slugs = index.tags.get(tag);
  if (slugs === undefined) return null;
  return index.posts.filter((slug) => slugs.has(slug));
}

function decodePath(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded).normalize("NFC");
  } catch {
    return null;
  }
}
