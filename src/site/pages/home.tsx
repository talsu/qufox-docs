import type { Note, SiteIndex } from "../../types.js";
import { messagesFor } from "../i18n.js";
import { Document, type PageContext } from "../layout.js";
import type { PageSlice } from "../pagination.js";
import { Pagination } from "../partials/pagination.js";
import { PostFeed } from "../partials/post-card.js";
import { SiteAside } from "../partials/site-aside.js";
import { noteTree } from "../tree.js";

export interface HomePageProps extends PageContext {
  index: SiteIndex;
  slice: PageSlice;
}

export function HomePage(props: HomePageProps) {
  const { index, slice, config, href } = props;
  const t = messagesFor(config.site.locale);
  const posts = index.posts
    .slice(slice.start, slice.end)
    .map((slug) => index.notes.get(slug))
    .filter((note): note is Note => note !== undefined);

  return (
    <Document
      config={config}
      href={href}
      path={slice.page === 1 ? "" : `page/${slice.page}`}
      container="wide"
      tree={noteTree(index)}
    >
      <div class="qf-twocol">
        <div class="qf-twocol__main">
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
            index={index}
            href={href}
            emptyTitle={t.noPostsTitle}
            emptyBody={t.noPostsBody}
          />
          <Pagination
            page={slice.page}
            totalPages={slice.totalPages}
            pageHref={(n) => (n === 1 ? href("") : href(`page/${n}`))}
            t={t}
          />
        </div>
        <SiteAside index={index} config={config} href={href} t={t} />
      </div>
    </Document>
  );
}
