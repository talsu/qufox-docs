import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import pc from "picocolors";
import type { IndexablePage, SearchProvider } from "./provider.js";

/** Minimal shape of the parts of the pagefind Node API we use. */
interface PagefindModule {
  createIndex(config?: { forceLanguage?: string }): Promise<{
    errors: string[];
    index?: PagefindIndex;
  }>;
  close(): Promise<unknown>;
}

interface PagefindIndex {
  addHTMLFile(file: { url: string; content: string }): Promise<{ errors: string[] }>;
  getFiles(): Promise<{ errors: string[]; files: Array<{ path: string; content: Uint8Array }> }>;
  deleteIndex(): Promise<unknown>;
}

/**
 * Pagefind-backed search. The native binary ships as an optional dependency;
 * if it is missing or errors, search is disabled with a warning and the rest
 * of the site is unaffected.
 */
export class PagefindSearch implements SearchProvider {
  #files = new Map<string, Uint8Array>();
  #available = false;

  get available(): boolean {
    return this.#available;
  }

  async build(pages: IndexablePage[], language: string): Promise<void> {
    const pagefind = await loadPagefind();
    if (pagefind === null) {
      this.#disable("the pagefind binary could not be loaded");
      return;
    }

    try {
      const { index, errors } = await pagefind.createIndex();
      if (index === undefined) {
        this.#disable(errors.join("; ") || "index creation failed");
        return;
      }
      for (const page of pages) {
        await index.addHTMLFile({ url: page.url, content: wrapHtml(page, language) });
      }
      const { files } = await index.getFiles();
      this.#files = new Map(files.map((file) => [file.path, file.content]));
      this.#available = this.#files.size > 0;
      await index.deleteIndex();
      await pagefind.close();
    } catch (error) {
      this.#disable(error instanceof Error ? error.message : String(error));
    }
  }

  getFile(path: string): Uint8Array | undefined {
    return this.#files.get(path.replace(/^\/+/, ""));
  }

  async writeTo(outDir: string): Promise<void> {
    if (!this.#available) return;
    for (const [path, content] of this.#files) {
      const abs = join(outDir, "pagefind", path);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content);
    }
  }

  #disable(reason: string): void {
    this.#available = false;
    this.#files = new Map();
    console.warn(pc.yellow(`  ! search disabled: ${reason}`));
  }
}

async function loadPagefind(): Promise<PagefindModule | null> {
  try {
    return (await import("pagefind")) as unknown as PagefindModule;
  } catch {
    return null;
  }
}

function wrapHtml(page: IndexablePage, language: string): string {
  return (
    `<!DOCTYPE html><html lang="${escapeAttribute(language)}"><head>` +
    `<title>${escapeHtml(page.title)}</title></head>` +
    `<body><main data-pagefind-body><h1>${escapeHtml(page.title)}</h1>${page.html}</main></body></html>`
  );
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
