import type { Element, ElementContent, Root, Text } from "hast";
import { defaultCalloutTitle, resolveCalloutType } from "./callout-icons.js";

// Matches only the first line so it works with or without soft-break splitting.
const MARKER_PATTERN = /^\[!([^\]]+)\]([+-])?[ \t]*([^\n]*)/;

/**
 * Rewrite Obsidian callout blockquotes (`> [!type] title`) into the design
 * system's qf-callout markup, using `<details>` for foldable callouts. Runs
 * bottom-up so nested callouts transform before their container.
 */
export function rehypeCallouts() {
  return (tree: Root): void => {
    transformChildren(tree);
  };
}

function transformChildren(parent: Root | Element): void {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child === undefined || child.type !== "element") continue;
    transformChildren(child);
    if (child.tagName === "blockquote") {
      const callout = toCallout(child);
      if (callout !== null) parent.children[i] = callout;
    }
  }
}

interface Marker {
  type: string;
  fold: "+" | "-" | null;
  title: string;
}

function toCallout(blockquote: Element): Element | null {
  const firstParagraph = blockquote.children.find(
    (node): node is Element => node.type === "element" && node.tagName === "p",
  );
  if (firstParagraph === undefined) return null;

  const firstText = firstParagraph.children[0];
  if (firstText === undefined || firstText.type !== "text") return null;

  const match = firstText.value.match(MARKER_PATTERN);
  if (match === null) return null;

  const marker: Marker = {
    type: match[1] ?? "note",
    fold: (match[2] as "+" | "-" | undefined) ?? null,
    title: (match[3] ?? "").trim(),
  };
  const { canonical, icon } = resolveCalloutType(marker.type);
  const title = marker.title !== "" ? marker.title : defaultCalloutTitle(canonical);

  stripMarker(firstParagraph, firstText, match[0].length);
  const body = blockquote.children.filter(
    (node) => node !== firstParagraph || firstParagraph.children.length > 0,
  );

  const titleChildren: ElementContent[] = [iconElement(icon), { type: "text", value: title }];
  const bodyElement: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["qf-callout__body"] },
    children: body,
  };
  const classNames = ["qf-callout", `qf-callout--${canonical}`];

  if (marker.fold !== null) {
    return {
      type: "element",
      tagName: "details",
      properties: { className: classNames, ...(marker.fold === "+" ? { open: true } : {}) },
      children: [
        {
          type: "element",
          tagName: "summary",
          properties: { className: ["qf-callout__title"] },
          children: titleChildren,
        },
        bodyElement,
      ],
    };
  }

  return {
    type: "element",
    tagName: "div",
    properties: { className: classNames },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["qf-callout__title"] },
        children: titleChildren,
      },
      bodyElement,
    ],
  };
}

/** Drop the consumed `[!type] title` marker from the first paragraph, keeping the body. */
function stripMarker(paragraph: Element, firstText: Text, consumed: number): void {
  const remainder = firstText.value.slice(consumed).replace(/^\n/, "");
  if (remainder === "") {
    paragraph.children.shift(); // the marker text node
    const next = paragraph.children[0];
    if (next !== undefined && next.type === "element" && next.tagName === "br") {
      paragraph.children.shift();
    }
  } else {
    firstText.value = remainder;
  }
}

function iconElement(icon: string): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["qf-callout__icon"] },
    children: [
      {
        type: "element",
        tagName: "svg",
        properties: { className: ["qf-icon", "qf-icon--sm"], ariaHidden: "true" },
        children: [
          {
            type: "element",
            tagName: "use",
            properties: { href: `#${icon}` },
            children: [],
          },
        ],
      },
    ],
  };
}
