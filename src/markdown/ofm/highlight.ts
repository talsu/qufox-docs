import type { Emphasis, Root } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";

const HIGHLIGHT_PATTERN = /==(?=\S)([^=]+?)(?<=\S)==/g;

/** Turn Obsidian `==highlights==` into `<mark>` elements. */
export function remarkHighlight() {
  return (tree: Root): void => {
    findAndReplace(tree, [
      [
        HIGHLIGHT_PATTERN,
        (_full, content: string): Emphasis => ({
          type: "emphasis",
          data: { hName: "mark" },
          children: [{ type: "text", value: content }],
        }),
      ],
    ]);
  };
}
