import type { ResolvedConfig } from "../../config/schema.js";
import type { SiteIndex } from "../../types.js";
import { absoluteUrl, FEED_PATH } from "../feeds.js";
import type { Messages } from "../i18n.js";
import type { Href } from "../url.js";

/** Tags listed in the side column before pointing at the full index. */
const ASIDE_TAGS = 14;

/**
 * Side column of the home feed: the busiest tags, the years, and the feed.
 * Kept shorter than a viewport — it sticks beside the feed while it scrolls.
 */
export function SiteAside(props: {
  index: SiteIndex;
  config: ResolvedConfig;
  href: Href;
  t: Messages;
}) {
  const { index, config, href, t } = props;

  const tags = [...index.tags.entries()]
    .map(([tag, slugs]) => ({ tag, count: slugs.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const years = new Map<number, number>();
  for (const slug of index.posts) {
    const note = index.notes.get(slug);
    if (note === undefined) continue;
    const year = note.date.getUTCFullYear();
    years.set(year, (years.get(year) ?? 0) + 1);
  }
  const yearList = [...years.entries()].sort((a, b) => b[0] - a[0]);
  const hasFeed = absoluteUrl(config, href, FEED_PATH) !== null;

  if (tags.length === 0 && yearList.length === 0) return null;

  return (
    <aside class="qf-twocol__aside qf-aside">
      {tags.length > 0 ? (
        <section class="qf-aside__section" aria-labelledby="aside-tags">
          <h2 class="qf-aside__title" id="aside-tags">
            {t.tags}
          </h2>
          <div class="qf-sources">
            {tags.slice(0, ASIDE_TAGS).map(({ tag, count }) => (
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
          {tags.length > ASIDE_TAGS ? (
            <p>
              <a class="qf-link" href={href("tags")}>
                {t.allTags} ({tags.length})
              </a>
            </p>
          ) : null}
        </section>
      ) : null}
      {yearList.length > 0 ? (
        <section class="qf-aside__section" aria-labelledby="aside-years">
          <h2 class="qf-aside__title" id="aside-years">
            {t.byYear}
          </h2>
          <ul class="qf-list">
            {yearList.map(([year, count]) => (
              <li class="qf-list__item qf-list__item--interactive">
                <a class="qf-list__text" href={`${href("archive")}#y${year}`}>
                  {year}
                </a>
                <span class="qf-list__trailing">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hasFeed ? (
        <section class="qf-aside__section">
          <a class="qf-link" href={href(FEED_PATH)}>
            <svg class="qf-icon qf-icon--sm" aria-hidden="true">
              <use href="#qf-i-rss" />
            </svg>{" "}
            {t.feed}
          </a>
        </section>
      ) : null}
    </aside>
  );
}
