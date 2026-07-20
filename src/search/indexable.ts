import type { Renderer } from "../render/renderer.js";
import type { Href } from "../site/url.js";
import type { SiteIndex } from "../types.js";
import type { IndexablePage } from "./provider.js";

/** Render every published post to the pages the search backend indexes. */
export async function buildIndexablePages(
  index: SiteIndex,
  renderer: Renderer,
  href: Href,
): Promise<IndexablePage[]> {
  const pages: IndexablePage[] = [];
  for (const slug of index.posts) {
    const note = index.notes.get(slug);
    if (note === undefined) continue;
    const { html } = await renderer.render(note);
    pages.push({ url: href(slug), title: note.title, html });
  }
  return pages;
}
