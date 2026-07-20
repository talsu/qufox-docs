import type { Note, SiteIndex } from "../../types.js";
import type { PageContext } from "../layout.js";

/**
 * Folder breadcrumb for a note. Intermediate segments link only when a
 * published note owns that folder path (e.g. via an index.md); otherwise they
 * are shown as plain text, since folders are not pages on their own.
 */
export function Breadcrumb(props: { note: Note; index: SiteIndex; href: PageContext["href"] }) {
  const { note, index, href } = props;
  const segments = note.slug.split("/");
  if (segments.length < 2) return null;

  const crumbs = segments.slice(0, -1).map((_, i) => {
    const path = segments.slice(0, i + 1).join("/");
    const target = index.notes.get(path);
    const label = segments[i] ?? path;
    return target?.published ? (
      <>
        <li>
          <a class="qf-breadcrumb__item" href={href(path)}>
            {target.title}
          </a>
        </li>
        <li class="qf-breadcrumb__sep" aria-hidden="true">
          /
        </li>
      </>
    ) : (
      <>
        <li>
          <span class="qf-breadcrumb__item">{label}</span>
        </li>
        <li class="qf-breadcrumb__sep" aria-hidden="true">
          /
        </li>
      </>
    );
  });

  return (
    <nav aria-label="Breadcrumb">
      <ol class="qf-breadcrumb">
        <li>
          <a class="qf-breadcrumb__item" href={href("")}>
            Home
          </a>
        </li>
        <li class="qf-breadcrumb__sep" aria-hidden="true">
          /
        </li>
        {crumbs}
        <li>
          <span class="qf-breadcrumb__item" aria-current="page">
            {note.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}
