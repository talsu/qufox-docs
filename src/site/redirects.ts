import type { ResolvedConfig } from "../config/schema.js";
import type { SiteIndex } from "../types.js";
import type { Href } from "./url.js";

/**
 * Legacy-URL redirects. Sources are a note's `redirect_from` frontmatter and
 * the site-level `redirects` config. A source is a site-root path with an
 * optional query string ("/2011/11/old-slug", "/?p=2117"); config sources may
 * end the path with "*" to forward a whole subtree.
 */
export interface RedirectRule {
  /** Normalized source path: decoded, NFC, no trailing slash ("/" for the root). */
  path: string;
  /** Query parameters the request must carry with exactly these values. */
  query: ReadonlyArray<readonly [string, string]>;
  /** True when the source path ended with "*": matches everything below `path`. */
  splat: boolean;
  /** Target URL. A "*" is replaced with the splat remainder. */
  to: string;
}

export interface RedirectTable {
  /** Exact-path rules, keyed by normalized path, most query parameters first. */
  exact: Map<string, RedirectRule[]>;
  /** Splat rules, longest prefix first. */
  splats: RedirectRule[];
  /** Number of rules that need a query string (unavailable in static exports). */
  queryRules: number;
}

/** Collect every redirect of the site. Conflicts are reported through `warn`. */
export function buildRedirectTable(
  index: SiteIndex,
  config: Pick<ResolvedConfig, "redirects">,
  href: Href,
  warn: (message: string) => void = () => {},
): RedirectTable {
  const table: RedirectTable = { exact: new Map(), splats: [], queryRules: 0 };
  const seen = new Map<string, string>();

  const add = (source: string, to: string, origin: string, allowSplat: boolean): void => {
    const rule = parseSource(source, to, allowSplat);
    if (rule === null) {
      warn(`${origin}: redirect source "${source}" must be a path starting with "/"`);
      return;
    }
    const key = ruleKey(rule);
    const previous = seen.get(key);
    if (previous !== undefined) {
      if (previous !== to) warn(`${origin}: redirect source "${source}" is already taken`);
      return;
    }
    seen.set(key, to);

    if (rule.query.length > 0) table.queryRules += 1;
    if (rule.splat) {
      table.splats.push(rule);
      return;
    }
    const bucket = table.exact.get(rule.path) ?? [];
    bucket.push(rule);
    table.exact.set(rule.path, bucket);
  };

  // Site-level rules are explicit, so they win over a note claiming the same source.
  for (const rule of config.redirects) {
    add(rule.from, resolveTarget(rule.to, href), "redirects", true);
  }
  for (const note of index.notes.values()) {
    if (!note.published) continue;
    for (const source of note.redirectFrom) add(source, href(note.slug), note.relPath, false);
  }

  for (const bucket of table.exact.values()) {
    bucket.sort((a, b) => b.query.length - a.query.length);
  }
  table.splats.sort((a, b) => b.path.length - a.path.length);
  return table;
}

/**
 * Find the redirect target for a request, or null. `pathname` and `search` are
 * taken from the request URL as-is (percent-encoded).
 */
export function matchRedirect(
  table: RedirectTable,
  pathname: string,
  search: string,
  options: { queryOnly?: boolean } = {},
): string | null {
  const path = normalizePath(pathname);
  if (path === null) return null;
  const params = new URLSearchParams(search);
  const satisfied = (rule: RedirectRule): boolean =>
    (options.queryOnly !== true || rule.query.length > 0) &&
    rule.query.every(([name, value]) => params.getAll(name).includes(value));

  const exact = table.exact.get(path)?.find(satisfied);
  if (exact !== undefined) return exact.to;

  for (const rule of table.splats) {
    if (!satisfied(rule)) continue;
    if (path === rule.path) return rule.to.replace("*", "");
    const prefix = rule.path === "/" ? "/" : `${rule.path}/`;
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length).split("/").map(encodeURIComponent).join("/");
      return rule.to.replace("*", rest);
    }
  }
  return null;
}

/** A plain site-root path is made basePath-aware; anything else is used verbatim. */
function resolveTarget(to: string, href: Href): string {
  return to.startsWith("/") && !to.startsWith("//") && !/[?#]/.test(to) ? href(to) : to;
}

function parseSource(source: string, to: string, allowSplat: boolean): RedirectRule | null {
  const trimmed = source.trim();
  if (!trimmed.startsWith("/")) return null;
  const queryAt = trimmed.indexOf("?");
  let rawPath = queryAt === -1 ? trimmed : trimmed.slice(0, queryAt);
  const rawQuery = queryAt === -1 ? "" : trimmed.slice(queryAt + 1);

  const splat = allowSplat && rawPath.endsWith("*");
  if (splat) rawPath = rawPath.slice(0, -1);
  const path = normalizePath(rawPath);
  if (path === null) return null;

  return { path, query: [...new URLSearchParams(rawQuery)], splat, to };
}

function normalizePath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const trimmed = decoded.normalize("NFC").replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function ruleKey(rule: RedirectRule): string {
  const query = [...rule.query]
    .map(([name, value]) => `${name}=${value}`)
    .sort()
    .join("&");
  return `${rule.splat ? "*" : "="}${rule.path}?${query}`;
}
