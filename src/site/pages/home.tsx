import type { Note, SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";
import type { PageSlice } from "../pagination.js";
import { Pagination } from "../partials/pagination.js";
import { PostFeed } from "../partials/post-card.js";

export interface HomePageProps extends PageContext {
  index: SiteIndex;
  slice: PageSlice;
}

export function HomePage(props: HomePageProps) {
  const { index, slice, config, href } = props;
  const posts = index.posts
    .slice(slice.start, slice.end)
    .map((slug) => index.notes.get(slug))
    .filter((note): note is Note => note !== undefined);

  return (
    <Document config={config} href={href}>
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">{config.site.title}</h1>
          {config.site.description !== "" ? (
            <p class="qf-page-header__subtitle">{config.site.description}</p>
          ) : null}
        </div>
      </div>
      <PostFeed
        notes={posts}
        href={href}
        emptyTitle="No posts yet"
        emptyBody="Add a markdown file to the content folder to get started."
      />
      <Pagination
        page={slice.page}
        totalPages={slice.totalPages}
        pageHref={(n) => (n === 1 ? href("") : href(`page/${n}`))}
      />
    </Document>
  );
}
