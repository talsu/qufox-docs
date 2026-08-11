import { describe, expect, it } from "vitest";
import { ancestorPaths, buildNoteTree, noteTree, type TreeNode } from "../../src/site/tree.js";
import { indexFromFiles } from "../helpers/markdown.js";

/** Compact shape for assertions: "folder/" for folders, note names otherwise. */
function outline(nodes: TreeNode[], depth = 0): string[] {
  return nodes.flatMap((node) =>
    node.kind === "folder"
      ? [
          `${"  ".repeat(depth)}${node.name}/ (${node.noteCount})`,
          ...outline(node.children, depth + 1),
        ]
      : [`${"  ".repeat(depth)}${node.name}`],
  );
}

describe("note tree", () => {
  it("nests notes by folder, folders before notes, each alphabetical", () => {
    const index = indexFromFiles({
      "zeta.md": "z",
      "alpha.md": "a",
      "guides/setup.md": "s",
      "guides/advanced/deep-dive.md": "d",
      "archive/old.md": "o",
    });

    expect(outline(buildNoteTree(index))).toEqual([
      "archive/ (1)",
      "  old",
      "guides/ (2)",
      "  advanced/ (1)",
      "    deep-dive",
      "  setup",
      "alpha",
      "zeta",
    ]);
  });

  it("puts a folder's overview note first, then natural order", () => {
    const index = indexFromFiles({
      "docs/step10.md": "b",
      "docs/step9.md": "a",
      "docs/README.md": "r",
    });

    expect(outline(buildNoteTree(index))).toEqual(["docs/ (3)", "  README", "  step9", "  step10"]);
  });

  it("leaves out unpublished notes and folders that empty out", () => {
    const index = indexFromFiles({
      "kept.md": "k",
      "drafts/wip.md": "---\ndraft: true\n---\n\nwip",
      "_private/secret.md": "s",
    });

    expect(outline(buildNoteTree(index))).toEqual(["kept"]);
  });

  it("carries the slug and title for linking", () => {
    const index = indexFromFiles({ "guides/setup.md": "---\ntitle: Set it up\n---\n\nbody" });
    const folder = buildNoteTree(index)[0];

    expect(folder?.kind).toBe("folder");
    if (folder?.kind !== "folder") return;
    expect(folder.children[0]).toEqual({
      kind: "note",
      name: "setup",
      slug: "guides/setup",
      title: "Set it up",
    });
  });

  it("reuses the built tree until the index revision changes", () => {
    const index = indexFromFiles({ "a.md": "a" });
    const first = noteTree(index);
    expect(noteTree(index)).toBe(first);

    index.revision += 1;
    expect(noteTree(index)).not.toBe(first);
  });

  it("lists a note's ancestor folders outermost first", () => {
    expect(ancestorPaths("guides/advanced/deep-dive.md")).toEqual(["guides", "guides/advanced"]);
    expect(ancestorPaths("root.md")).toEqual([]);
  });
});
