import type { Note, SiteIndex } from "../../types.js";
import type { Messages } from "../i18n.js";
import type { PageContext } from "../layout.js";

/**
 * Older/newer navigation between adjacent posts. The feed is newest-first, so
 * the next-older post sits after the current slug and the next-newer before it.
 */
export function PrevNext(props: {
  note: Note;
  index: SiteIndex;
  href: PageContext["href"];
  t: Messages;
}) {
  const { note, index, href, t } = props;
  const position = index.posts.indexOf(note.slug);
  if (position === -1) return null;

  const newer = position > 0 ? index.notes.get(index.posts[position - 1] ?? "") : undefined;
  const older =
    position < index.posts.length - 1
      ? index.notes.get(index.posts[position + 1] ?? "")
      : undefined;
  if (newer === undefined && older === undefined) return null;

  return (
    <nav class="qf-postnav" aria-label={t.adjacentPosts}>
      {older !== undefined ? (
        <PostLink note={older} href={href} eyebrow={t.older} side="prev" />
      ) : null}
      {newer !== undefined ? (
        <PostLink note={newer} href={href} eyebrow={t.newer} side="next" />
      ) : null}
    </nav>
  );
}

function PostLink(props: {
  note: Note;
  href: PageContext["href"];
  eyebrow: string;
  side: "prev" | "next";
}) {
  return (
    <a
      class={`qf-postnav__link qf-postnav__link--${props.side}`}
      href={props.href(props.note.slug)}
    >
      <span class="qf-postnav__eyebrow">{props.eyebrow}</span>
      <span class="qf-postnav__title">{props.note.title}</span>
    </a>
  );
}
