/** One indexable document handed to the search backend. */
export interface IndexablePage {
  /** Site URL of the page (what a result links to). */
  url: string;
  title: string;
  /** Rendered article HTML (the searchable body). */
  html: string;
}

/**
 * Full-text search backend. Implementations degrade gracefully: when the
 * backend is unavailable, `available` is false and the site still works
 * without search.
 */
export interface SearchProvider {
  readonly available: boolean;
  /** Build (or rebuild) the index from the given pages. */
  build(pages: IndexablePage[], language: string): Promise<void>;
  /** In-memory index file for serve mode, or undefined if unknown. */
  getFile(path: string): Uint8Array | undefined;
  /** Write the index files under `<outDir>/pagefind` for static export. */
  writeTo(outDir: string): Promise<void>;
}
