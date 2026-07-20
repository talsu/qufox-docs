import type { Note, SiteIndex } from "../../types.js";
import type { PageContext } from "../layout.js";

/** "Linked from" card listing published notes that link to this one. */
export function Backlinks(props: { note: Note; index: SiteIndex; href: PageContext["href"] }) {
  const { note, index, href } = props;
  const sources = [...(index.backlinks.get(note.slug) ?? [])]
    .map((slug) => index.notes.get(slug))
    .filter((source): source is Note => source?.published === true)
    .sort((a, b) => a.title.localeCompare(b.title));

  if (sources.length === 0) return null;

  return (
    <section class="qf-card">
      <div class="qf-card__header">
        <h2 class="qf-card__title">Linked from</h2>
      </div>
      <div class="qf-card__body">
        <ul class="qf-list">
          {sources.map((source) => (
            <li class="qf-list__item qf-list__item--interactive">
              <a class="qf-list__text" href={href(source.slug)}>
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
