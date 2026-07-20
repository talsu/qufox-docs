import type { Element, Root } from "hast";
import { toString as hastToString } from "hast-util-to-string";
import { SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { TocEntry } from "../types.js";
import type { ShikiService } from "./shiki.js";

/**
 * Final hast pass: stamp the qf-* structure the design system expects onto
 * constructs Prose cannot style from bare semantics, and collect the
 * table of contents.
 */
export function rehypeQfClasses() {
  return (tree: Root, file: VFile) => {
    const toc: TocEntry[] = [];

    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "table" && parent !== undefined && typeof index === "number") {
        addClass(node, "qf-table");
        const wrapper: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["qf-table-wrap"] },
          children: [node],
        };
        parent.children[index] = wrapper;
        return SKIP;
      }

      if (node.tagName === "a") {
        const href = node.properties.href;
        if (typeof href === "string" && /^https?:\/\//.test(href)) {
          addClass(node, "qf-link--external");
          node.properties.target = "_blank";
          node.properties.rel = ["noopener", "noreferrer"];
        }
        return;
      }

      if (node.tagName === "img") {
        node.properties.loading ??= "lazy";
        node.properties.decoding ??= "async";
        return;
      }

      if (node.tagName === "h2" || node.tagName === "h3") {
        const id = node.properties.id;
        if (typeof id === "string") {
          toc.push({
            depth: node.tagName === "h2" ? 2 : 3,
            text: hastToString(node),
            id,
          });
        }
      }
    });

    file.data.toc = toc;
  };
}

/** Downgrade code fences with unknown grammars to plaintext so shiki never throws. */
export function rehypeCodeLanguageFallback(shiki: ShikiService) {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "code") return;
      const className = node.properties.className;
      if (!Array.isArray(className)) return;
      const languageIndex = className.findIndex(
        (item) => typeof item === "string" && item.startsWith("language-"),
      );
      if (languageIndex === -1) return;
      const language = String(className[languageIndex]).slice("language-".length);
      if (!shiki.isRenderable(language)) {
        node.properties.dataLang = language;
        className[languageIndex] = "language-plaintext";
      }
    });
  };
}

function addClass(node: Element, name: string): void {
  const existing = node.properties.className;
  if (Array.isArray(existing)) {
    if (!existing.includes(name)) existing.push(name);
  } else {
    node.properties.className = [name];
  }
}
