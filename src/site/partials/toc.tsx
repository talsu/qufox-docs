import type { TocEntry } from "../../types.js";

/**
 * "On this page" navigation built from the rendered heading outline.
 * A collapsible <details>, closed by default on every viewport.
 */
export function TableOfContents(props: { toc: TocEntry[] }) {
  if (props.toc.length < 2) return null;
  return (
    <details class="qf-toc">
      <summary class="qf-toc__title">On this page</summary>
      <ul>
        {props.toc.map((entry) => (
          <li
            class={`qf-toc__item${entry.depth === 3 ? " qf-toc__item--d3" : " qf-toc__item--d2"}`}
          >
            <a class="qf-toc__link" href={`#${entry.id}`}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
