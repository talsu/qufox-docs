import type { Note, SiteIndex } from "../../types.js";
import { formatDate, type PageContext } from "../layout.js";
import { noteImageUrl } from "../note-image.js";

/** Tags shown on a feed entry before the rest collapse into a count. */
const FEED_TAGS = 4;

/**
 * A single entry in a post feed (home, tag). The whole entry is one link — the
 * title's — with the tags as separate links layered above it.
 */
export function PostCard(props: { note: Note; index: SiteIndex; href: PageContext["href"] }) {
  const { note, index, href } = props;
  const image = noteImageUrl(note, index, href);
  const shown = note.tags.slice(0, FEED_TAGS);
  const hidden = note.tags.length - shown.length;

  return (
    <article class={`qf-story qf-story--stretched${image !== null ? " qf-story--pictured" : ""}`}>
      {image !== null ? (
        <img class="qf-story__media" src={image} alt="" loading="lazy" decoding="async" />
      ) : null}
      <div class="qf-story__kicker">
        <time datetime={note.date.toISOString()}>{formatDate(note.date)}</time>
      </div>
      <h2 class="qf-story__title">
        <a href={href(note.slug)}>{note.title}</a>
      </h2>
      {note.excerpt !== "" ? (
        <p class="qf-story__summary qf-clamp qf-clamp--3">{note.excerpt}</p>
      ) : null}
      {shown.length > 0 ? (
        <div class="qf-cluster qf-cluster--tight qf-story__sources">
          {shown.map((tag) => (
            <a class="qf-tag" href={href(`tags/${tag}`)}>
              #{tag}
            </a>
          ))}
          {hidden > 0 ? <span class="qf-tag">+{hidden}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

/** A list of feed entries, or an empty state when there are none. */
export function PostFeed(props: {
  notes: Note[];
  index: SiteIndex;
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
    <div class="qf-feed">
      {props.notes.map((note) => (
        <PostCard note={note} index={props.index} href={props.href} />
      ))}
    </div>
  );
}
