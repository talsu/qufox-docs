import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

/** Code fence languages qufox-docs does not render (yet). */
const UNSUPPORTED_LANGUAGES = new Set([
  "mermaid",
  "dataview",
  "dataviewjs",
  "query",
  "tasks",
  "chart",
]);

/**
 * Replace fenced blocks in an unsupported language with a visible "unsupported"
 * callout and record a warning, instead of leaking the raw source.
 */
export function remarkUnsupported() {
  return (tree: Root, file: VFile): void => {
    visit(tree, "code", (node, index, parent) => {
      const lang = node.lang?.toLowerCase();
      if (lang === undefined || !UNSUPPORTED_LANGUAGES.has(lang)) return;
      if (parent === undefined || index === undefined) return;

      file.message(`Unsupported "${lang}" block skipped`);
      const replacement: Html = { type: "html", value: unsupportedCalloutHtml(lang) };
      parent.children.splice(index, 1, replacement);
    });
  };
}

function unsupportedCalloutHtml(lang: string): string {
  return (
    `<div class="qf-callout qf-callout--warning">` +
    `<div class="qf-callout__title">` +
    `<span class="qf-callout__icon">` +
    `<svg class="qf-icon qf-icon--sm" aria-hidden="true"><use href="#qf-i-alert"/></svg>` +
    `</span>Unsupported block</div>` +
    `<div class="qf-callout__body">This <code>${lang}</code> block isn't rendered by qufox-docs yet.</div>` +
    `</div>`
  );
}
