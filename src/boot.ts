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
import { buildIndexablePages } from "./search/indexable.js";
import { PagefindSearch } from "./search/pagefind.js";
import type { SearchProvider } from "./search/provider.js";
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
  search: SearchProvider;
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
  return {
    config,
    index,
    markdown,
    renderer: new Renderer(markdown),
    search: new PagefindSearch(),
  };
}

/** Build (or rebuild) the full-text search index from the current site state. */
export async function buildSearchIndex(site: Site): Promise<void> {
  const pages = await buildIndexablePages(site.index, site.renderer, siteHref(site.config));
  await site.search.build(pages, site.config.site.locale);
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

  const rebuildSearch = debounce(() => {
    buildSearchIndex(site).catch((error) => {
      console.warn(pc.yellow(`  ! search index rebuild failed: ${String(error)}`));
    });
  }, 2000);

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
        rebuildSearch();
        hub.broadcast("change", {
          revision: site.index.revision,
          pages: [...invalidated].map((slug) => `/${slug}`),
          global: applied.structural,
        });
      } catch (error) {
        console.error(pc.red(`  ! failed to apply file changes: ${String(error)}`));
      }
    });
    // Build the initial index off the startup path.
    rebuildSearch();
  }

  const app = createApp({ ...site, livereload });

  return {
    ...site,
    app,
    livereload,
    watcher,
    start: () => startServer(app, config),
    close: async () => {
      rebuildSearch.cancel();
      livereload?.close();
      await watcher?.close();
    },
  };
}

interface Debounced {
  (): void;
  cancel(): void;
}

function debounce(fn: () => void, ms: number): Debounced {
  let timer: NodeJS.Timeout | undefined;
  const debounced = (() => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
    timer.unref?.();
  }) as Debounced;
  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
  };
  return debounced;
}
