import type { ResolvedConfig } from "../config/schema.js";

/** URL construction — the single place basePath and encoding are applied. */
export type Href = (path: string) => string;

/**
 * The href helper for a site: the dev/live server always serves from the root,
 * so basePath only applies to static exports.
 */
export function siteHref(config: ResolvedConfig): Href {
  return createHref(config.mode === "serve" ? "/" : config.build.basePath);
}

/**
 * Build the site's href helper. `path` is a decoded site-relative path
 * ("guides/setup", "한글/소개", "assets/app/engine.css"); each segment is
 * percent-encoded and the configured basePath is prefixed.
 */
export function createHref(basePath: string): Href {
  return (path) => {
    const clean = path.replace(/^\/+/, "");
    if (clean === "") return basePath;
    const encoded = clean
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${basePath}${encoded}`;
  };
}

/** Decode a request pathname into a slug ("/guides/setup" → "guides/setup"). */
export function slugFromPathname(pathname: string, basePath: string): string | null {
  let path = pathname;
  if (basePath !== "/" && path.startsWith(basePath)) {
    path = `/${path.slice(basePath.length)}`;
  }
  try {
    return decodeURIComponent(path).normalize("NFC").replace(/^\/+/, "").replace(/\/+$/, "");
  } catch {
    return null;
  }
}
