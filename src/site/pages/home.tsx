import type { Note, SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";
import { PostFeed } from "../partials/post-card.js";

export interface HomePageProps extends PageContext {
  index: SiteIndex;
}

export function HomePage(props: HomePageProps) {
  const { index, config, href } = props;
  const posts = index.posts
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
    </Document>
  );
}
