import { type Context, Hono } from "hono";
import type { ResolvedConfig } from "../config/schema.js";
import type { Renderer } from "../render/renderer.js";
import type { SearchProvider } from "../search/provider.js";
import { ArchivePage } from "../site/pages/archive.js";
import { HomePage } from "../site/pages/home.js";
import { NotFoundPage } from "../site/pages/not-found.js";
import { PostPage } from "../site/pages/post.js";
import { SearchPage } from "../site/pages/search.js";
import { TagPage } from "../site/pages/tag.js";
import { TagsPage } from "../site/pages/tags.js";
import { paginate } from "../site/pagination.js";
import { siteHref, slugFromPathname } from "../site/url.js";
import type { SiteIndex } from "../types.js";
import { serveEngineAsset, servePagefindAsset, serveVaultAsset } from "./assets.js";
import type { LiveReloadHub } from "./livereload.js";

export interface AppContext {
  config: ResolvedConfig;
  index: SiteIndex;
  renderer: Renderer;
  search: SearchProvider;
  livereload?: LiveReloadHub | undefined;
}

/** Build the Hono app serving the site (used by `serve`; `build` renders directly). */
export function createApp(context: AppContext): Hono {
  const { config, index, renderer, search } = context;
  const href = siteHref(config);
  const page = { config, href };
  const pageSize = config.feed.pageSize;

  const app = new Hono();

  if (context.livereload !== undefined) {
    app.get("/__qufox/events", context.livereload.handler);
  }

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
  app.get("/search", (c) => listResponse(c, "search", SearchPage(page)));

  // Search index (Pagefind bundle, served from memory).
  app.get("/pagefind/*", (c) => {
    const file = search.getFile(c.req.path.slice("/pagefind/".length));
    if (file === undefined) return c.notFound();
    return servePagefindAsset(c, c.req.path, file);
  });

  // Assets.
  app.get("/assets/design/:file", (c) =>
    serveEngineAsset(c, `design/${c.req.param("file")}`, "immutable"),
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

  function notFound(c: Context) {
    return c.html(NotFoundPage(page), 404);
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
