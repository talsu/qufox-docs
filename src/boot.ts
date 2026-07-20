import type { Hono } from "hono";
import type { ResolvedConfig } from "./config/schema.js";
import { scanVault } from "./content/scan.js";
import { buildSiteIndex } from "./content/site-index.js";
import { MarkdownRenderer } from "./markdown/pipeline.js";
import { Renderer } from "./render/renderer.js";
import { createApp } from "./server/app.js";
import { type RunningServer, startServer } from "./server/serve.js";
import type { SiteIndex } from "./types.js";

export interface Site {
  config: ResolvedConfig;
  index: SiteIndex;
  markdown: MarkdownRenderer;
  renderer: Renderer;
}

/** Scan the vault and prepare the render pipeline. */
export async function bootSite(config: ResolvedConfig): Promise<Site> {
  const [scan, markdown] = await Promise.all([
    scanVault(config.contentDirAbs),
    MarkdownRenderer.create({ breaks: config.markdown.breaks }),
  ]);
  const index = buildSiteIndex(scan, config);
  return { config, index, markdown, renderer: new Renderer(markdown) };
}

export interface QufoxServer extends Site {
  app: Hono;
  start(): Promise<RunningServer>;
}

/** Programmatic entry point: boot the site and build the HTTP app. */
export async function createServer(config: ResolvedConfig): Promise<QufoxServer> {
  const site = await bootSite(config);
  const app = createApp(site);
  return { ...site, app, start: () => startServer(app, config) };
}
