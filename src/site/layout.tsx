import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { DS_VERSION } from "../assets-dir.js";
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
  children?: Child;
}

/** FOUC-free theme boot: dark is the token default, light is opted into. */
function themeInitScript(themeDefault: string): string {
  return (
    `(function(){try{var t=localStorage.getItem("qufox-theme");` +
    `var d=${JSON.stringify(themeDefault)};` +
    `var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches;` +
    `if(t==="light"||(!t&&(d==="light"||(d==="system"&&m))))` +
    `document.documentElement.dataset.theme="light";}catch(e){}})();`
  );
}

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
        <script>{raw(themeInitScript(config.theme.default))}</script>
        <link rel="stylesheet" href={`${href("assets/design/tokens.css")}?v=${DS_VERSION}`} />
        <link rel="stylesheet" href={`${href("assets/design/components.css")}?v=${DS_VERSION}`} />
        <link
          rel="stylesheet"
          href={`${href("assets/app/engine.css")}?v=${config.engineVersion}`}
        />
        {config.mode === "serve" ? <script defer src={href("assets/app/livereload.js")} /> : null}
      </head>
      <body>
        <div class="qf-app-shell">
          <header class="qf-app-shell__navbar">
            <nav class="qf-navbar" aria-label="Main">
              <a class="qf-navbar__brand" href={href("")}>
                {config.site.title}
              </a>
              <span class="qf-navbar__spacer" />
            </nav>
          </header>
          <main class="qf-app-shell__main">
            <div class="qf-container qf-container--narrow">{props.children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

/** Consistent date presentation across pages (ISO date, locale-neutral). */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
