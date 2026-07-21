import type { TocEntry } from "../../types.js";

/**
 * "On this page" navigation, rendered as a drawer that is hidden by default and
 * opened from the navbar. The heading tree inside is always expanded; on narrow
 * viewports the drawer overlays the content, on wide ones it floats in the
 * right margin. Kept out of the app-shell grid so the article stays centered.
 */
export function TableOfContents(props: { toc: TocEntry[] }) {
  if (props.toc.length < 2) return null;
  return (
    <>
      <div class="qf-drawer-backdrop" data-toc-backdrop hidden />
      <aside
        class="qf-drawer qf-toc-drawer"
        role="dialog"
        aria-label="On this page"
        data-toc-panel
        hidden
      >
        <div class="qf-drawer__header">
          <h2 class="qf-drawer__title">On this page</h2>
          <button
            type="button"
            class="qf-btn qf-btn--ghost qf-btn--icon"
            data-toc-close
            aria-label="Close"
          >
            <svg class="qf-icon qf-icon--sm" aria-hidden="true">
              <use href="#qf-i-x" />
            </svg>
          </button>
        </div>
        <nav class="qf-drawer__body qf-toc">
          <ul>
            {props.toc.map((entry) => (
              <li
                class={`qf-toc__item${entry.depth === 3 ? " qf-toc__item--d3" : " qf-toc__item--d2"}`}
              >
                <a class="qf-toc__link" href={`#${entry.id}`} data-toc-link>
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
