import type { Note, SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";
import type { PageSlice } from "../pagination.js";
import { Pagination } from "../partials/pagination.js";
import { PostFeed } from "../partials/post-card.js";

export interface TagPageProps extends PageContext {
  index: SiteIndex;
  tag: string;
  /** Published slugs carrying this tag, newest first. */
  slugs: string[];
  slice: PageSlice;
}

/** Posts for a single tag, paginated. */
export function TagPage(props: TagPageProps) {
  const { index, tag, slugs, slice, config, href } = props;
  const posts = slugs
    .slice(slice.start, slice.end)
    .map((slug) => index.notes.get(slug))
    .filter((note): note is Note => note !== undefined);

  return (
    <Document config={config} href={href} title={`#${tag}`}>
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">#{tag}</h1>
          <p class="qf-page-header__subtitle">
            {slugs.length} {slugs.length === 1 ? "post" : "posts"}
          </p>
        </div>
      </div>
      <PostFeed
        notes={posts}
        href={href}
        emptyTitle="No posts"
        emptyBody="No published posts carry this tag."
      />
      <Pagination
        page={slice.page}
        totalPages={slice.totalPages}
        pageHref={(n) => (n === 1 ? href(`tags/${tag}`) : href(`tags/${tag}/page/${n}`))}
      />
    </Document>
  );
}
