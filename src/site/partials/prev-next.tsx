import type { Note, SiteIndex } from "../../types.js";
import type { PageContext } from "../layout.js";

/**
 * Older/newer navigation between adjacent posts. The feed is newest-first, so
 * the next-older post sits after the current slug and the next-newer before it.
 */
export function PrevNext(props: { note: Note; index: SiteIndex; href: PageContext["href"] }) {
  const { note, index, href } = props;
  const position = index.posts.indexOf(note.slug);
  if (position === -1) return null;

  const newer = position > 0 ? index.notes.get(index.posts[position - 1] ?? "") : undefined;
  const older =
    position < index.posts.length - 1
      ? index.notes.get(index.posts[position + 1] ?? "")
      : undefined;
  if (newer === undefined && older === undefined) return null;

  return (
    <nav class="qf-grid qf-grid--cols-2" aria-label="Adjacent posts">
      {older !== undefined ? <PostLink note={older} href={href} eyebrow="← Older" /> : <span />}
      {newer !== undefined ? <PostLink note={newer} href={href} eyebrow="Newer →" /> : <span />}
    </nav>
  );
}

function PostLink(props: { note: Note; href: PageContext["href"]; eyebrow: string }) {
  return (
    <a class="qf-card qf-card--interactive" href={props.href(props.note.slug)}>
      <div class="qf-card__body">
        <div class="qf-postnav__eyebrow">{props.eyebrow}</div>
        <div>{props.note.title}</div>
      </div>
    </a>
  );
}
