import { type Context, Hono } from "hono";
import type { ResolvedConfig } from "../config/schema.js";
import type { Renderer } from "../render/renderer.js";
import { HomePage } from "../site/pages/home.js";
import { NotFoundPage } from "../site/pages/not-found.js";
import { PostPage } from "../site/pages/post.js";
import { createHref, slugFromPathname } from "../site/url.js";
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
  // The dev/live server always serves from the root; basePath applies to exports.
  const href = createHref(config.mode === "serve" ? "/" : config.build.basePath);
  const page = { config, href };

  const app = new Hono();

  if (context.livereload !== undefined) {
    app.get("/__qufox/events", context.livereload.handler);
  }

  app.get("/", (c) => {
    const etag = `"home-${index.revision}"`;
    if (c.req.header("if-none-match") === etag) return c.body(null, 304);
    c.header("ETag", etag);
    c.header("Cache-Control", "no-cache");
    return c.html(HomePage({ index, ...page }));
  });

  app.get("/assets/design/:file", (c) =>
    serveEngineAsset(c, `design/${c.req.param("file")}`, "immutable"),
  );
  app.get("/assets/app/:file", (c) => {
    const file = c.req.param("file");
    return serveEngineAsset(c, file === "engine.css" ? file : `client/${file}`, "no-cache");
  });
  app.get("/assets/vault/*", (c) => {
    const encoded = c.req.path.slice("/assets/vault/".length);
    let decoded: string;
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      return c.notFound();
    }
    return serveVaultAsset(c, config, decoded);
  });

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
    return c.html(PostPage({ note, page: rendered, ...page }));
  });

  app.notFound((c) => notFound(c));

  function notFound(c: Context) {
    return c.html(NotFoundPage(page), 404);
  }

  return app;
}
