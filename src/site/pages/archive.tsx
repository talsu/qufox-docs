import type { Note, SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";

export interface ArchivePageProps extends PageContext {
  index: SiteIndex;
}

interface YearGroup {
  year: number;
  notes: Note[];
}

/** All posts grouped by year, newest first. */
export function ArchivePage(props: ArchivePageProps) {
  const { index, config, href } = props;
  const groups = groupByYear(
    index.posts
      .map((slug) => index.notes.get(slug))
      .filter((note): note is Note => note !== undefined),
  );

  return (
    <Document config={config} href={href} title="Archive">
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">Archive</h1>
          <p class="qf-page-header__subtitle">{index.posts.length} posts</p>
        </div>
      </div>
      {groups.length === 0 ? (
        <div class="qf-empty">
          <div class="qf-empty__title">No posts yet</div>
          <div class="qf-empty__body">Published posts will appear here by year.</div>
        </div>
      ) : (
        <div class="qf-stack qf-stack--loose">
          {groups.map((group, i) => (
            <section>
              {i > 0 ? <hr class="qf-divider" /> : null}
              <h2>{group.year}</h2>
              <ul class="qf-list">
                {group.notes.map((note) => (
                  <li class="qf-list__item qf-list__item--interactive">
                    <a class="qf-list__text" href={href(note.slug)}>
                      {note.title}
                    </a>
                    <span class="qf-list__trailing">{monthDay(note.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Document>
  );
}

function groupByYear(notes: Note[]): YearGroup[] {
  const byYear = new Map<number, Note[]>();
  for (const note of notes) {
    const year = note.date.getUTCFullYear();
    const bucket = byYear.get(year) ?? [];
    bucket.push(note);
    byYear.set(year, bucket);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, groupNotes]) => ({ year, notes: groupNotes }));
}

function monthDay(date: Date): string {
  return date.toISOString().slice(5, 10);
}
