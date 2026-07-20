import type { Root, Text } from "mdast";
import { visit } from "unist-util-visit";

const BLOCK_ID_PATTERN = /(?:^|\s)\^([A-Za-z0-9][A-Za-z0-9-]*)$/;

/**
 * Turn Obsidian block anchors (`text ^block-id` at the end of a block) into a
 * DOM id so `[[note#^block-id]]` links can target them. The marker text is
 * stripped from the output.
 */
export function remarkBlockIds() {
  return (tree: Root): void => {
    visit(tree, (node) => {
      if (node.type !== "paragraph" && node.type !== "heading" && node.type !== "listItem") {
        return;
      }
      const children = "children" in node ? node.children : [];
      const last = children[children.length - 1];
      if (last === undefined || last.type !== "text") return;

      const match = (last as Text).value.match(BLOCK_ID_PATTERN);
      if (match === null) return;

      (last as Text).value = (last as Text).value.slice(0, match.index).replace(/\s+$/, "");
      const data = (node.data ??= {});
      const hProperties = ((data as { hProperties?: Record<string, unknown> }).hProperties ??= {});
      (hProperties as Record<string, unknown>).id = `block-${match[1]}`;
    });
  };
}
