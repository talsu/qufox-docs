import type { SiteIndex } from "../../types.js";
import { messagesFor } from "../i18n.js";
import { Document, type PageContext } from "../layout.js";
import { noteTree } from "../tree.js";

export interface TagsPageProps extends PageContext {
  index: SiteIndex;
}

/** Index of every tag with its post count. */
export function TagsPage(props: TagsPageProps) {
  const { index, config, href } = props;
  const t = messagesFor(config.site.locale);
  const tags = [...index.tags.entries()]
    .map(([tag, slugs]) => ({ tag, count: slugs.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return (
    <Document config={config} href={href} title={t.tags} path="tags" tree={noteTree(index)}>
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">{t.tags}</h1>
          <p class="qf-page-header__subtitle">{t.tagCount(tags.length)}</p>
        </div>
      </div>
      {tags.length === 0 ? (
        <div class="qf-empty">
          <div class="qf-empty__title">{t.noTagsTitle}</div>
          <div class="qf-empty__body">{t.noTagsBody}</div>
        </div>
      ) : (
        <div class="qf-sources">
          {tags.map(({ tag, count }) => (
            <a
              class="qf-source qf-source--link"
              href={href(`tags/${tag}`)}
              aria-label={`#${tag}, ${t.postCount(count)}`}
            >
              #{tag}
              <span class="qf-source__count" aria-hidden="true">
                {count}
              </span>
            </a>
          ))}
        </div>
      )}
    </Document>
  );
}
