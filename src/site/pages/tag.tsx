import type { Note, SiteIndex } from "../../types.js";
import { messagesFor } from "../i18n.js";
import { Document, type PageContext } from "../layout.js";
import type { PageSlice } from "../pagination.js";
import { Pagination } from "../partials/pagination.js";
import { PostFeed } from "../partials/post-card.js";
import { noteTree } from "../tree.js";

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
  const t = messagesFor(config.site.locale);
  const posts = slugs
    .slice(slice.start, slice.end)
    .map((slug) => index.notes.get(slug))
    .filter((note): note is Note => note !== undefined);

  return (
    <Document
      config={config}
      href={href}
      title={`#${tag}`}
      path={slice.page === 1 ? `tags/${tag}` : `tags/${tag}/page/${slice.page}`}
      container="reading"
      tree={noteTree(index)}
    >
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">#{tag}</h1>
          <p class="qf-page-header__subtitle">{t.postCount(slugs.length)}</p>
        </div>
      </div>
      <PostFeed
        notes={posts}
        index={index}
        href={href}
        emptyTitle={t.noTagPostsTitle}
        emptyBody={t.noTagPostsBody}
      />
      <Pagination
        page={slice.page}
        totalPages={slice.totalPages}
        t={t}
        pageHref={(n) => (n === 1 ? href(`tags/${tag}`) : href(`tags/${tag}/page/${n}`))}
      />
    </Document>
  );
}
