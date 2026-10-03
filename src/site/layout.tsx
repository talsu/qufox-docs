import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { DS_VERSION, ICONS_SPRITE } from "../assets-dir.js";
import type { ResolvedConfig } from "../config/schema.js";
import { absoluteUrl, FEED_PATH } from "./feeds.js";
import { type Messages, messagesFor } from "./i18n.js";
import { BrowseDrawer } from "./partials/browse-drawer.js";
import type { TreeNode } from "./tree.js";
import type { Href } from "./url.js";

export interface PageContext {
  config: ResolvedConfig;
  href: Href;
}

export interface DocumentProps extends PageContext {
  /** Page title; the site title is appended automatically. */
  title?: string;
  description?: string;
  /**
   * Site path of this page ("" for home, a slug, "tags/x"). With `site.url`
   * set it becomes the canonical URL; omit it for pages with no stable address.
   */
  path?: string;
  /** Publication date; marks the page as an article for link previews. */
  published?: Date | undefined;
  /** Site URL of the page's lead image, for link previews. */
  image?: string | undefined;
  /** Content width: lists read best narrow, a feed with a side column needs room. */
  container?: "default" | "reading" | "wide";
  /** Optional right-hand column (e.g. the table of contents). */
  aside?: Child;
  /** Folder tree for the browse drawer; omitted, the drawer is not rendered. */
  tree?: TreeNode[];
  /** Slug of the note being viewed, marked in the tree. */
  currentSlug?: string | undefined;
  /** Folder paths the tree starts expanded at. */
  openPaths?: ReadonlySet<string> | undefined;
  children?: Child;
}

/** FOUC-free theme boot: dark is the token default, light is opted into. */
/** FOUC-free init: apply the saved (or default) theme and brand before paint. */
function themeInitScript(themeDefault: string, brandDefault: string): string {
  return (
    `(function(){try{var r=document.documentElement;` +
    `var t=localStorage.getItem("qufox-theme")||${JSON.stringify(themeDefault)};` +
    `if(t==="system")t=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";` +
    `r.dataset.theme=t;` +
    `var b=localStorage.getItem("qufox-brand")||${JSON.stringify(brandDefault)};` +
    `if(b&&b!=="qufox")r.dataset.brand=b;else delete r.dataset.brand;` +
    `}catch(e){}})();`
  );
}

const BRANDS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "qufox", label: "qufox" },
  { value: "ocean", label: "Ocean" },
  { value: "forest", label: "Forest" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
];

export function Document(props: DocumentProps) {
  const { config, href } = props;
  const title =
    props.title !== undefined ? `${props.title} · ${config.site.title}` : config.site.title;
  const description = props.description ?? config.site.description;
  const canonical = props.path !== undefined ? absoluteUrl(config, href, props.path) : null;
  const feed = absoluteUrl(config, href, FEED_PATH);
  const t = messagesFor(config.site.locale);
  const image =
    props.image !== undefined && config.site.url !== undefined
      ? new URL(props.image, config.site.url).href
      : null;
  const containerClass =
    props.container === undefined || props.container === "default"
      ? "qf-container"
      : `qf-container qf-container--${props.container}`;
  const section = props.path?.split("/")[0];

  return (
    <html lang={config.site.locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description !== "" ? <meta name="description" content={description} /> : null}
        {canonical !== null ? <link rel="canonical" href={canonical} /> : null}
        {canonical !== null ? <meta property="og:url" content={canonical} /> : null}
        <meta property="og:site_name" content={config.site.title} />
        <meta property="og:title" content={props.title ?? config.site.title} />
        {description !== "" ? <meta property="og:description" content={description} /> : null}
        <meta property="og:type" content={props.published !== undefined ? "article" : "website"} />
        {props.published !== undefined ? (
          <meta property="article:published_time" content={props.published.toISOString()} />
        ) : null}
        {image !== null ? <meta property="og:image" content={image} /> : null}
        <meta name="twitter:card" content={image !== null ? "summary_large_image" : "summary"} />
        {feed !== null ? (
          <link rel="alternate" type="application/rss+xml" title={config.site.title} href={feed} />
        ) : null}
        {config.site.favicon !== undefined ? (
          <link rel="icon" href={href(`assets/vault/${config.site.favicon}`)} />
        ) : null}
        <meta name="generator" content={`qufox-docs ${config.engineVersion}`} />
        <meta name="qufox-design-version" content={DS_VERSION} />
        <meta name="qufox-base" content={config.build.basePath} />
        <script>{raw(themeInitScript(config.theme.default, config.theme.brand))}</script>
        <link rel="stylesheet" href={`${href("assets/fonts/fonts.css")}?v=${DS_VERSION}`} />
        <link rel="stylesheet" href={`${href("assets/design/tokens.css")}?v=${DS_VERSION}`} />
        <link rel="stylesheet" href={`${href("assets/design/components.css")}?v=${DS_VERSION}`} />
        <link rel="stylesheet" href={`${href("assets/design/icons.css")}?v=${DS_VERSION}`} />
        <link
          rel="stylesheet"
          href={`${href("assets/app/engine.css")}?v=${config.engineVersion}`}
        />
        <script defer src={href("assets/app/theme.js")} />
        {config.mode === "serve" && config.server.liveReload ? (
          <script defer src={href("assets/app/livereload.js")} />
        ) : null}
      </head>
      <body>
        {raw(ICONS_SPRITE)}
        <a class="qf-btn qf-btn--secondary qf-skip" href="#main">
          {t.skipToContent}
        </a>
        <div class="qf-app-shell">
          <header class="qf-app-shell__navbar">
            <nav class="qf-navbar" aria-label={t.navMain}>
              {props.tree !== undefined ? <BrowseToggle t={t} /> : null}
              <a class="qf-navbar__brand" href={href("")}>
                {config.site.title}
              </a>
              <div class="qf-navbar__nav">
                <NavLink href={href("tags")} current={section === "tags"}>
                  {t.tags}
                </NavLink>
                <NavLink href={href("archive")} current={section === "archive"}>
                  {t.archive}
                </NavLink>
              </div>
              <span class="qf-navbar__spacer" />
              <div class="qf-cluster qf-cluster--tight">
                {props.aside !== undefined ? <TocToggle t={t} /> : null}
                <BrandSelect t={t} />
                <ThemeToggle t={t} />
              </div>
            </nav>
          </header>
          <main class="qf-app-shell__main" id="main" tabindex={-1} data-scroll-root>
            <div class={containerClass}>{props.children}</div>
            <footer class={`${containerClass} qf-footer`}>
              <p class="qf-footer__note">
                {config.site.title}
                {config.site.description !== "" ? ` — ${config.site.description}` : ""}
              </p>
              <nav class="qf-footer__links" aria-label={t.siteLinks}>
                <a href={href("tags")}>{t.tags}</a>
                <a href={href("archive")}>{t.archive}</a>
                <a href={href("browse")}>{t.browse}</a>
                {feed !== null ? (
                  <a href={href(FEED_PATH)}>
                    <svg class="qf-icon qf-icon--sm" aria-hidden="true">
                      <use href="#qf-i-rss" />
                    </svg>
                    {t.feed}
                  </a>
                ) : null}
                <a href="https://github.com/talsu/qufox-docs" rel="noopener">
                  {t.poweredBy}
                </a>
              </nav>
            </footer>
          </main>
        </div>
        <button type="button" class="qf-totop" data-to-top aria-label={t.toTop} tabindex={-1}>
          <svg class="qf-icon qf-icon--md" aria-hidden="true">
            <use href="#qf-i-chevron-up" />
          </svg>
        </button>
        {props.tree !== undefined ? (
          <BrowseDrawer
            nodes={props.tree}
            href={href}
            t={t}
            currentSlug={props.currentSlug}
            openPaths={props.openPaths}
          />
        ) : null}
        {props.aside}
      </body>
    </html>
  );
}

function NavLink(props: { href: string; current: boolean; children?: Child }) {
  return (
    <a class="qf-navbar__link" href={props.href} aria-current={props.current ? "page" : undefined}>
      {props.children}
    </a>
  );
}

function BrowseToggle(props: { t: Messages }) {
  return (
    <button
      type="button"
      class="qf-btn qf-btn--ghost qf-btn--icon"
      data-tree-toggle
      aria-label={props.t.browseFiles}
      aria-expanded="false"
    >
      <svg class="qf-icon qf-icon--sm" aria-hidden="true">
        <use href="#qf-i-folder" />
      </svg>
    </button>
  );
}

function TocToggle(props: { t: Messages }) {
  return (
    <button
      type="button"
      class="qf-btn qf-btn--ghost qf-btn--icon"
      data-toc-toggle
      aria-label={props.t.onThisPage}
      aria-expanded="false"
    >
      <svg class="qf-icon qf-icon--sm" aria-hidden="true">
        <use href="#qf-i-hash" />
      </svg>
    </button>
  );
}

function BrandSelect(props: { t: Messages }) {
  return (
    <span class="qf-select">
      <select data-brand-select aria-label={props.t.brandColor}>
        {BRANDS.map((brand) => (
          <option value={brand.value}>{brand.label}</option>
        ))}
      </select>
    </span>
  );
}

function ThemeToggle(props: { t: Messages }) {
  return (
    <button
      type="button"
      class="qf-btn qf-btn--ghost qf-btn--icon"
      data-theme-toggle
      aria-label={props.t.toggleTheme}
    >
      <svg class="qf-icon qf-icon--sm" aria-hidden="true" data-theme-icon="dark">
        <use href="#qf-i-moon" />
      </svg>
      <svg class="qf-icon qf-icon--sm" aria-hidden="true" data-theme-icon="light">
        <use href="#qf-i-sun" />
      </svg>
    </button>
  );
}

/** Consistent date presentation across pages (ISO date, locale-neutral). */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
