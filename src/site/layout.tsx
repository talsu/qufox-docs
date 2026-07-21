import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { DS_VERSION, ICONS_SPRITE } from "../assets-dir.js";
import type { ResolvedConfig } from "../config/schema.js";
import type { Href } from "./url.js";

export interface PageContext {
  config: ResolvedConfig;
  href: Href;
}

export interface DocumentProps extends PageContext {
  /** Page title; the site title is appended automatically. */
  title?: string;
  description?: string;
  /** Optional right-hand column (e.g. the table of contents). */
  aside?: Child;
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

  return (
    <html lang={config.site.locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description !== "" ? <meta name="description" content={description} /> : null}
        <meta name="generator" content={`qufox-docs ${config.engineVersion}`} />
        <meta name="qufox-design-version" content={DS_VERSION} />
        <meta name="qufox-base" content={config.build.basePath} />
        <script>{raw(themeInitScript(config.theme.default, config.theme.brand))}</script>
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
        <div class="qf-app-shell">
          <header class="qf-app-shell__navbar">
            <nav class="qf-navbar" aria-label="Main">
              <a class="qf-navbar__brand" href={href("")}>
                {config.site.title}
              </a>
              <div class="qf-navbar__nav">
                <a class="qf-navbar__link" href={href("tags")}>
                  Tags
                </a>
                <a class="qf-navbar__link" href={href("archive")}>
                  Archive
                </a>
              </div>
              <span class="qf-navbar__spacer" />
              <div class="qf-cluster qf-cluster--tight">
                {props.aside !== undefined ? <TocToggle /> : null}
                <BrandSelect />
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <main class="qf-app-shell__main">
            <div class="qf-container">{props.children}</div>
          </main>
        </div>
        {props.aside}
      </body>
    </html>
  );
}

function TocToggle() {
  return (
    <button
      type="button"
      class="qf-btn qf-btn--ghost qf-btn--icon"
      data-toc-toggle
      aria-label="On this page"
      aria-expanded="false"
    >
      <svg class="qf-icon qf-icon--sm" aria-hidden="true">
        <use href="#qf-i-hash" />
      </svg>
    </button>
  );
}

function BrandSelect() {
  return (
    <span class="qf-select">
      <select data-brand-select aria-label="Brand color">
        {BRANDS.map((brand) => (
          <option value={brand.value}>{brand.label}</option>
        ))}
      </select>
    </span>
  );
}

function ThemeToggle() {
  return (
    <button
      type="button"
      class="qf-btn qf-btn--ghost qf-btn--icon"
      data-theme-toggle
      aria-label="Toggle color theme"
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
