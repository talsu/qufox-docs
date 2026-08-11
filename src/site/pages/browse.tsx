import type { SiteIndex } from "../../types.js";
import { Document, type PageContext } from "../layout.js";
import { FileTree } from "../partials/file-tree.js";
import { noteTree, type TreeNode } from "../tree.js";

export interface BrowsePageProps extends PageContext {
  index: SiteIndex;
}

/** The whole vault as a folder tree, with top-level folders expanded. */
export function BrowsePage(props: BrowsePageProps) {
  const { index, config, href } = props;
  const tree = noteTree(index);
  const topLevel = new Set(
    tree
      .filter((node): node is Extract<TreeNode, { kind: "folder" }> => node.kind === "folder")
      .map((folder) => folder.path),
  );

  return (
    <Document config={config} href={href} title="Browse" tree={tree} openPaths={topLevel}>
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">Browse</h1>
          <p class="qf-page-header__subtitle">{summary(tree)}</p>
        </div>
      </div>
      <FileTree nodes={tree} href={href} openPaths={topLevel} />
    </Document>
  );
}

function summary(tree: TreeNode[]): string {
  let notes = 0;
  let folders = 0;
  for (const node of tree) {
    if (node.kind === "folder") {
      folders += 1;
      notes += node.noteCount;
    } else {
      notes += 1;
    }
  }
  const noteLabel = `${notes} ${notes === 1 ? "note" : "notes"}`;
  return folders === 0
    ? noteLabel
    : `${noteLabel} in ${folders} top-level ${folders === 1 ? "folder" : "folders"}`;
}
