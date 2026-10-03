import { raw } from "hono/html";
import type { Note, RenderedPage, SiteIndex } from "../../types.js";
import { messagesFor } from "../i18n.js";
import { Document, formatDate, type PageContext } from "../layout.js";
import { noteImageUrl } from "../note-image.js";
import { Backlinks } from "../partials/backlinks.js";
import { Breadcrumb } from "../partials/breadcrumb.js";
import { PrevNext } from "../partials/prev-next.js";
import { TableOfContents } from "../partials/toc.js";
import { ancestorPaths, noteTree } from "../tree.js";

/** Tags shown under the title; a longer list continues at the end of the post. */
const HEADER_TAGS = 5;

export interface PostPageProps extends PageContext {
  note: Note;
  page: RenderedPage;
  index: SiteIndex;
}

export function PostPage(props: PostPageProps) {
  const { note, page, index, config, href } = props;
  const t = messagesFor(config.site.locale);
  const proseClasses = ["qf-prose", ...cssClasses(note)].join(" ");

  return (
    <Document
      config={config}
      href={href}
      title={note.title}
      description={note.excerpt}
      path={note.slug}
      image={noteImageUrl(note, index, href) ?? undefined}
      published={note.dateSource === "frontmatter" ? note.date : undefined}
      aside={page.toc.length >= 2 ? <TableOfContents toc={page.toc} t={t} /> : undefined}
      tree={noteTree(index)}
      currentSlug={note.slug}
      openPaths={new Set(ancestorPaths(note.relPath))}
    >
      <Breadcrumb note={note} index={index} href={href} t={t} />
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">{note.title}</h1>
          <p class="qf-page-header__subtitle">
            <time datetime={note.date.toISOString()}>{formatDate(note.date)}</time>
          </p>
        </div>
      </div>
      {note.tags.length > 0 ? (
        <div class="qf-cluster qf-cluster--tight qf-post-tags">
          {note.tags.slice(0, HEADER_TAGS).map((tag) => (
            <a class="qf-tag" href={href(`tags/${tag}`)}>
              #{tag}
            </a>
          ))}
          {note.tags.length > HEADER_TAGS ? (
            <a class="qf-tag" href="#all-tags">
              +{note.tags.length - HEADER_TAGS}
            </a>
          ) : null}
        </div>
      ) : null}
      <article class={proseClasses}>{raw(page.html)}</article>
      {note.tags.length > HEADER_TAGS ? (
        <div class="qf-cluster qf-cluster--tight qf-post-tags-all" id="all-tags">
          {note.tags.map((tag) => (
            <a class="qf-tag" href={href(`tags/${tag}`)}>
              #{tag}
            </a>
          ))}
        </div>
      ) : null}
      <Backlinks note={note} index={index} href={href} t={t} />
      <PrevNext note={note} index={index} href={href} t={t} />
    </Document>
  );
}

function cssClasses(note: Note): string[] {
  const value = note.frontmatter.cssclasses ?? note.frontmatter.cssclass;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim() !== "") return value.trim().split(/\s+/);
  return [];
}
