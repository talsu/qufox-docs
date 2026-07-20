import type { SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";

export interface TagsPageProps extends PageContext {
  index: SiteIndex;
}

/** Index of every tag with its post count. */
export function TagsPage(props: TagsPageProps) {
  const { index, config, href } = props;
  const tags = [...index.tags.entries()]
    .map(([tag, slugs]) => ({ tag, count: slugs.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return (
    <Document config={config} href={href} title="Tags">
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">Tags</h1>
          <p class="qf-page-header__subtitle">{tags.length} tags</p>
        </div>
      </div>
      {tags.length === 0 ? (
        <div class="qf-empty">
          <div class="qf-empty__title">No tags yet</div>
          <div class="qf-empty__body">Add #tags or frontmatter tags to your notes.</div>
        </div>
      ) : (
        <div class="qf-cluster">
          {tags.map(({ tag, count }) => (
            <a class="qf-tag" href={href(`tags/${tag}`)} aria-label={`#${tag}, ${count} posts`}>
              #{tag}
              <span class="qf-badge qf-badge--count" aria-hidden="true">
                {count}
              </span>
            </a>
          ))}
        </div>
      )}
    </Document>
  );
}
