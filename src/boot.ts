import type { FSWatcher } from "chokidar";
import type { Hono } from "hono";
import pc from "picocolors";
import type { ResolvedConfig } from "./config/schema.js";
import { scanVault } from "./content/scan.js";
import { applyVaultChanges, buildSiteIndex, collectInvalidations } from "./content/site-index.js";
import { createVaultWatcher } from "./content/watcher.js";
import { MarkdownRenderer } from "./markdown/pipeline.js";
import { ShikiService } from "./markdown/shiki.js";
import { Renderer } from "./render/renderer.js";
import { createApp } from "./server/app.js";
import { LiveReloadHub } from "./server/livereload.js";
import { type RunningServer, startServer } from "./server/serve.js";
import { siteHref } from "./site/url.js";
import type { SiteIndex } from "./types.js";

export interface Site {
  config: ResolvedConfig;
  index: SiteIndex;
  markdown: MarkdownRenderer;
  renderer: Renderer;
}

/** Scan the vault and prepare the render pipeline. */
export async function bootSite(config: ResolvedConfig): Promise<Site> {
  const [scan, shiki] = await Promise.all([scanVault(config.contentDirAbs), ShikiService.create()]);
  const index = buildSiteIndex(scan, config);
  const markdown = new MarkdownRenderer(shiki, {
    breaks: config.markdown.breaks,
    index,
    href: siteHref(config),
  });
  return { config, index, markdown, renderer: new Renderer(markdown) };
}

export interface CreateServerOptions {
  /** Watch the vault and push live-reload events. Defaults to serve mode. */
  watch?: boolean;
}

export interface QufoxServer extends Site {
  app: Hono;
  livereload: LiveReloadHub | undefined;
  watcher: FSWatcher | undefined;
  start(): Promise<RunningServer>;
  close(): Promise<void>;
}

/** Programmatic entry point: boot the site and build the HTTP app. */
export async function createServer(
  config: ResolvedConfig,
  options: CreateServerOptions = {},
): Promise<QufoxServer> {
  const site = await bootSite(config);
  const watch = options.watch ?? config.mode === "serve";

  let livereload: LiveReloadHub | undefined;
  let watcher: FSWatcher | undefined;

  if (watch) {
    livereload = new LiveReloadHub();
    const hub = livereload;
    watcher = createVaultWatcher(config, async (batch) => {
      try {
        const applied = await applyVaultChanges(site.index, config, batch);
        for (const warning of applied.warnings) {
          console.warn(pc.yellow(`  ! ${warning}`));
        }
        const invalidated = collectInvalidations(site.index, [
          ...applied.changedSlugs,
          ...applied.removedSlugs,
        ]);
        for (const slug of invalidated) site.renderer.invalidate(slug);
        hub.broadcast("change", {
          revision: site.index.revision,
          pages: [...invalidated].map((slug) => `/${slug}`),
          global: applied.structural,
        });
      } catch (error) {
        console.error(pc.red(`  ! failed to apply file changes: ${String(error)}`));
      }
    });
  }

  const app = createApp({ ...site, livereload });

  return {
    ...site,
    app,
    livereload,
    watcher,
    start: () => startServer(app, config),
    close: async () => {
      livereload?.close();
      await watcher?.close();
    },
  };
}
