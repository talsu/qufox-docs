import type { Heading, RootContent } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";

/**
 * Slice a note's mdast children to the section under a heading fragment:
 * everything from the matching heading up to the next heading of equal or
 * higher rank. The heading itself is excluded (the transclusion shows the
 * section body, matching Obsidian). Returns all children when no heading
 * matches, or an empty list for a `^block` fragment (handled elsewhere).
 */
export function sliceByFragment(children: RootContent[], fragment: string | null): RootContent[] {
  if (fragment === null) return children;

  const wanted = fragment.split("#").pop()?.trim().toLowerCase() ?? "";
  if (wanted === "" || wanted.startsWith("^")) return children;

  const startIndex = children.findIndex(
    (node): node is Heading =>
      node.type === "heading" && mdastToString(node).trim().toLowerCase() === wanted,
  );
  if (startIndex === -1) return children;

  const startDepth = (children[startIndex] as Heading).depth;
  let endIndex = children.length;
  for (let i = startIndex + 1; i < children.length; i++) {
    const node = children[i];
    if (node?.type === "heading" && node.depth <= startDepth) {
      endIndex = i;
      break;
    }
  }
  return children.slice(startIndex + 1, endIndex);
}
