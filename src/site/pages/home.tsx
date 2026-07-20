import type { Note, SiteIndex } from "../../types.js";
import { Document, formatDate, type PageContext } from "../layout.js";

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
      {posts.length === 0 ? (
        <div class="qf-empty">
          <div class="qf-empty__title">No posts yet</div>
          <div class="qf-empty__body">
            Add a markdown file to the content folder to get started.
          </div>
        </div>
      ) : (
        <div class="qf-stack qf-stack--loose">
          {posts.map((note) => (
            <PostCard note={note} href={props.href} />
          ))}
        </div>
      )}
    </Document>
  );
}

function PostCard(props: { note: Note; href: PageContext["href"] }) {
  const { note, href } = props;
  return (
    <article class="qf-card qf-card--interactive">
      <div class="qf-card__header">
        <h2 class="qf-card__title">
          <a href={href(note.slug)}>{note.title}</a>
        </h2>
      </div>
      {note.excerpt !== "" ? (
        <div class="qf-card__body">
          <p>{note.excerpt}</p>
        </div>
      ) : null}
      <div class="qf-card__footer">
        <div class="qf-cluster qf-cluster--tight">
          <time datetime={note.date.toISOString()}>{formatDate(note.date)}</time>
          {note.tags.map((tag) => (
            <span class="qf-tag">#{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
