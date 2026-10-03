import type { Link, PhrasingContent, Root, Text } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { VFile } from "vfile";
import { relPathKey } from "../../content/slugs.js";
import { getRenderContext } from "./context.js";

// A tag follows a boundary, needs at least one non-digit, and may nest with "/".
const TAG_PATTERN = /(^|[\s(])#([\p{L}\p{N}_/-]*[\p{L}_-][\p{L}\p{N}_/-]*)/gu;

/** Turn inline `#tags` into links to their tag pages, styled as qf-tag. */
export function remarkTags() {
  return (tree: Root, file: VFile): void => {
    const { href, index, relPath } = getRenderContext(file);
    // The boot scan decides what is a tag (it sees the raw source, so `\#word`
    // and `*#word*` are not tags). Rendering follows it, so a link never points
    // at a tag page that does not exist. Text outside the index links as before.
    const slug = index.byRelPath.get(relPathKey(relPath));
    const known = slug !== undefined ? index.notes.get(slug)?.tags : undefined;
    findAndReplace(tree, [
      [
        TAG_PATTERN,
        (_full, boundary: string, tag: string): PhrasingContent[] | false => {
          if (known !== undefined && !known.includes(tag.toLowerCase())) return false;
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
