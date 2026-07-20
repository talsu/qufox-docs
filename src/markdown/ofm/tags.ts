import type { Link, PhrasingContent, Root, Text } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { VFile } from "vfile";
import { getRenderContext } from "./context.js";

// A tag follows a boundary, needs at least one non-digit, and may nest with "/".
const TAG_PATTERN = /(^|[\s(])#([\p{L}\p{N}_/-]*[\p{L}_-][\p{L}\p{N}_/-]*)/gu;

/** Turn inline `#tags` into links to their tag pages, styled as qf-tag. */
export function remarkTags() {
  return (tree: Root, file: VFile): void => {
    const { href } = getRenderContext(file);
    findAndReplace(tree, [
      [
        TAG_PATTERN,
        (_full, boundary: string, tag: string): PhrasingContent[] => {
          const link: Link = {
            type: "link",
            url: href(`tags/${tag.toLowerCase()}`),
            children: [{ type: "text", value: `#${tag}` }],
            data: { hProperties: { className: ["qf-tag"] } },
          };
          const prefix: Text = { type: "text", value: boundary };
          return boundary === "" ? [link] : [prefix, link];
        },
      ],
    ]);
  };
}
