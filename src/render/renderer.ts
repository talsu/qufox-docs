import { readFile } from "node:fs/promises";
import type { MarkdownRenderer } from "../markdown/pipeline.js";
import type { Note, RenderedPage } from "../types.js";

/**
 * Lazy per-note render cache. A note is rendered on first request and reused
 * until its content hash changes (the watcher invalidates on writes).
 */
export class Renderer {
  readonly #cache = new Map<string, RenderedPage>();
  readonly #markdown: MarkdownRenderer;

  constructor(markdown: MarkdownRenderer) {
    this.#markdown = markdown;
  }

  async render(note: Note): Promise<RenderedPage> {
    const cached = this.#cache.get(note.slug);
    if (cached !== undefined && cached.contentHash === note.contentHash) return cached;

    const raw = await readFile(note.absPath, "utf8");
    const { html, toc } = await this.#markdown.render(raw);
    const page: RenderedPage = { html, toc, contentHash: note.contentHash };
    this.#cache.set(note.slug, page);
    return page;
  }

  invalidate(slug: string): void {
    this.#cache.delete(slug);
  }

  clear(): void {
    this.#cache.clear();
  }
}
