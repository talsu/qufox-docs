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

    stripDuplicateTitle(tree, file);

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

/**
 * The template renders the note title in the page header, so a leading H1
 * that repeats it (the common Obsidian pattern) is dropped from the body.
 */
function stripDuplicateTitle(tree: Root, file: VFile): void {
  const pageTitle = file.data.pageTitle;
  if (typeof pageTitle !== "string" || pageTitle === "") return;

  const firstElementIndex = tree.children.findIndex((child) => child.type === "element");
  if (firstElementIndex === -1) return;
  const first = tree.children[firstElementIndex];
  if (first === undefined || first.type !== "element" || first.tagName !== "h1") return;

  const matches = hastToString(first).trim().toLowerCase() === pageTitle.trim().toLowerCase();
  if (matches) tree.children.splice(firstElementIndex, 1);
}

function addClass(node: Element, name: string): void {
  const existing = node.properties.className;
  if (Array.isArray(existing)) {
    if (!existing.includes(name)) existing.push(name);
  } else {
    node.properties.className = [name];
  }
}
