import type { Note } from "../../types.js";
import { formatDate, type PageContext } from "../layout.js";

/** A single entry in a post feed (home, tag, archive). */
export function PostCard(props: { note: Note; href: PageContext["href"] }) {
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
        <div class="qf-cluster qf-cluster--tight qf-post-meta">
          <time datetime={note.date.toISOString()}>{formatDate(note.date)}</time>
          {note.tags.map((tag) => (
            <a class="qf-tag" href={href(`tags/${tag}`)}>
              #{tag}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

/** A vertical stack of post cards, or an empty state when there are none. */
export function PostFeed(props: {
  notes: Note[];
  href: PageContext["href"];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (props.notes.length === 0) {
    return (
      <div class="qf-empty">
        <div class="qf-empty__title">{props.emptyTitle}</div>
        <div class="qf-empty__body">{props.emptyBody}</div>
      </div>
    );
  }
  return (
    <div class="qf-stack qf-stack--loose">
      {props.notes.map((note) => (
        <PostCard note={note} href={props.href} />
      ))}
    </div>
  );
}
