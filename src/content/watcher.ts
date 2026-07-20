import { relative } from "node:path";
import { type FSWatcher, watch } from "chokidar";
import type { ResolvedConfig } from "../config/schema.js";
import { normalizeRelPath } from "./slugs.js";

export type ChangeKind = "add" | "change" | "unlink" | "unlinkDir";

export interface ChangeBatch {
  /** relPath → kind. Directory removals use a trailing "/" on the key. */
  paths: Map<string, ChangeKind>;
}

export type BatchHandler = (batch: ChangeBatch) => void | Promise<void>;

const BATCH_QUIET_MS = 100;

/**
 * Watch the vault and coalesce raw chokidar events into one batch per burst
 * (editor atomic writes, git checkouts, vault syncs). Dot-entries and
 * node_modules are ignored; `_`-prefixed paths stay watched because they are
 * indexed (just unpublished).
 */
export function createVaultWatcher(config: ResolvedConfig, onBatch: BatchHandler): FSWatcher {
  const root = config.contentDirAbs;
  const pending = new Map<string, ChangeKind>();
  let timer: NodeJS.Timeout | undefined;

  const flush = () => {
    timer = undefined;
    if (pending.size === 0) return;
    const batch: ChangeBatch = { paths: new Map(pending) };
    pending.clear();
    void onBatch(batch);
  };

  const record = (kind: ChangeKind) => (absPath: string) => {
    const rel = toWatchedRelPath(root, absPath);
    if (rel === null) return;
    const key = kind === "unlinkDir" ? `${rel}/` : rel;
    pending.set(key, mergeKind(pending.get(key), kind));
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, BATCH_QUIET_MS);
  };

  const watcher = watch(root, {
    ignoreInitial: true,
    ignored: (path: string) => {
      const rel = relative(root, path);
      if (rel === "" || rel.startsWith("..")) return false;
      return normalizeRelPath(rel)
        .split("/")
        .some((segment) => segment.startsWith(".") || segment === "node_modules");
    },
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    // Windows native watching (libuv fs-event) aborts the process on unicode
    // paths under Node 24, so poll there by default; `poll` forces it anywhere.
    usePolling: config.server.poll || process.platform === "win32",
  });

  watcher
    .on("add", record("add"))
    .on("change", record("change"))
    .on("unlink", record("unlink"))
    .on("unlinkDir", record("unlinkDir"));

  return watcher;
}

function toWatchedRelPath(root: string, absPath: string): string | null {
  const rel = relative(root, absPath);
  if (rel === "" || rel.startsWith("..")) return null;
  const normalized = normalizeRelPath(rel);
  const segments = normalized.split("/");
  if (segments.some((segment) => segment.startsWith(".") || segment === "node_modules")) {
    return null;
  }
  return normalized;
}

function mergeKind(previous: ChangeKind | undefined, next: ChangeKind): ChangeKind {
  if (previous === undefined) return next;
  // A file added and modified within one batch is still an addition; a file
  // removed and re-created is a change.
  if (previous === "add" && next === "change") return "add";
  if (previous === "unlink" && next === "add") return "change";
  return next;
}
