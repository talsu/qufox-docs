import type { TocEntry } from "../../types.js";

/** "On this page" navigation built from the rendered heading outline. */
export function TableOfContents(props: { toc: TocEntry[] }) {
  if (props.toc.length < 2) return null;
  return (
    <nav class="qf-toc" aria-label="On this page">
      <div class="qf-toc__title">On this page</div>
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
    </nav>
  );
}
