import { raw } from "hono/html";
import type { Note, RenderedPage, SiteIndex } from "../../types.js";
import { Document, formatDate, type PageContext } from "../layout.js";
import { Backlinks } from "../partials/backlinks.js";
import { Breadcrumb } from "../partials/breadcrumb.js";
import { PrevNext } from "../partials/prev-next.js";
import { TableOfContents } from "../partials/toc.js";

export interface PostPageProps extends PageContext {
  note: Note;
  page: RenderedPage;
  index: SiteIndex;
}

export function PostPage(props: PostPageProps) {
  const { note, page, index, config, href } = props;
  const proseClasses = ["qf-prose", ...cssClasses(note)].join(" ");

  return (
    <Document
      config={config}
      href={href}
      title={note.title}
      description={note.excerpt}
      aside={page.toc.length >= 2 ? <TableOfContents toc={page.toc} /> : undefined}
    >
      <Breadcrumb note={note} index={index} href={href} />
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">{note.title}</h1>
          <p class="qf-page-header__subtitle">
            <time datetime={note.date.toISOString()}>{formatDate(note.date)}</time>
          </p>
        </div>
      </div>
      {note.tags.length > 0 ? (
        <div class="qf-cluster qf-cluster--tight">
          {note.tags.map((tag) => (
            <a class="qf-tag" href={href(`tags/${tag}`)}>
              #{tag}
            </a>
          ))}
        </div>
      ) : null}
      <article class={proseClasses} data-pagefind-body>
        {raw(page.html)}
      </article>
      <Backlinks note={note} index={index} href={href} />
      <PrevNext note={note} index={index} href={href} />
    </Document>
  );
}

function cssClasses(note: Note): string[] {
  const value = note.frontmatter.cssclasses ?? note.frontmatter.cssclass;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim() !== "") return value.trim().split(/\s+/);
  return [];
}
