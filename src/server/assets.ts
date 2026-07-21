import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import type { Context } from "hono";
import picomatch from "picomatch";
import { ASSETS_DIR } from "../assets-dir.js";
import type { ResolvedConfig } from "../config/schema.js";
import { hasHiddenSegment } from "../content/publish.js";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

/** Serve a file bundled with the engine (design system, client scripts). */
export async function serveEngineAsset(
  c: Context,
  relPath: string,
  cache: "immutable" | "no-cache",
): Promise<Response> {
  if (relPath.includes("..") || relPath.includes("\\")) return c.notFound();
  const absPath = join(ASSETS_DIR, relPath);
  try {
    const body = await readFile(absPath);
    const type = MIME_TYPES[extname(absPath).toLowerCase()];
    if (type !== undefined) c.header("Content-Type", type);
    c.header(
      "Cache-Control",
      cache === "immutable" ? "public, max-age=31536000, immutable" : "no-cache",
    );
    return c.body(new Uint8Array(body));
  } catch {
    return c.notFound();
  }
}

/**
 * Serve a vault attachment by its vault-relative path. Markdown sources,
 * hidden segments, excluded globs, and path escapes are never served.
 */
export async function serveVaultAsset(
  c: Context,
  config: ResolvedConfig,
  decodedRelPath: string,
): Promise<Response> {
  const relPath = decodedRelPath.normalize("NFC");
  if (relPath === "" || relPath.includes("\\")) return c.notFound();
  if (hasHiddenSegment(relPath)) return c.notFound();
  if (/\.md$/i.test(relPath)) return c.notFound();
  if (
    config.publish.exclude.length > 0 &&
    picomatch(config.publish.exclude, { dot: true })(relPath)
  ) {
    return c.notFound();
  }

  const absPath = resolve(config.contentDirAbs, relPath);
  if (!absPath.startsWith(config.contentDirAbs + sep)) return c.notFound();

  try {
    const body = await readFile(absPath);
    const type = MIME_TYPES[extname(absPath).toLowerCase()];
    if (type !== undefined) {
      c.header("Content-Type", type);
    } else {
      c.header("Content-Type", "application/octet-stream");
      c.header("Content-Disposition", "attachment");
    }
    c.header("Cache-Control", "no-cache");
    return c.body(new Uint8Array(body));
  } catch {
    return c.notFound();
  }
}
