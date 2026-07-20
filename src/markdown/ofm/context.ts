import type { RootContent } from "mdast";
import type { VFile } from "vfile";
import type { Href } from "../../site/url.js";
import type { SiteIndex } from "../../types.js";

/** Maximum transclusion depth before a note embed degrades to a link. */
export const MAX_EMBED_DEPTH = 5;

/**
 * Per-render context threaded to the OFM plugins through `vfile.data`.
 * The index and href are stable for a site; relPath and embed tracking vary
 * per note (and per transclusion level).
 */
export interface RenderContext {
  index: SiteIndex;
  href: Href;
  /** Vault-relative path of the note being rendered (relative-link resolution). */
  relPath: string;
  /** 0 for the top-level note, incremented for each transclusion level. */
  embedDepth: number;
  /** Slugs currently being transcluded, for cycle detection. */
  embedStack: ReadonlySet<string>;
  /**
   * Render an embedded note's body to mdast children, or null when it cannot
   * be transcluded (missing, unpublished, cyclic, or too deep) so the caller
   * falls back to a link.
   */
  loadEmbed(
    slug: string,
    fragment: string | null,
    parent: RenderContext,
  ): Promise<RootContent[] | null>;
}

export function getRenderContext(file: VFile): RenderContext {
  const context = file.data.renderContext;
  if (context === undefined) {
    throw new Error("renderContext missing from vfile.data — pipeline misconfigured");
  }
  return context as RenderContext;
}

declare module "vfile" {
  interface DataMap {
    renderContext: RenderContext;
    pageTitle: string | undefined;
    toc: unknown;
  }
}
