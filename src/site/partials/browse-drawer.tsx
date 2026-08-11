import type { TreeNode } from "../tree.js";
import type { Href } from "../url.js";
import { FileTree } from "./file-tree.js";

export interface BrowseDrawerProps {
  nodes: TreeNode[];
  href: Href;
  currentSlug?: string | undefined;
  openPaths?: ReadonlySet<string> | undefined;
}

/**
 * The folder tree as a left drawer, hidden by default and opened from the
 * navbar — the reading counterpart to the `/browse` page, so you can jump to a
 * neighbouring note without leaving the one you are on. Mirrors the table of
 * contents drawer on the opposite edge.
 */
export function BrowseDrawer(props: BrowseDrawerProps) {
  return (
    <>
      <div class="qf-drawer-backdrop" data-tree-backdrop hidden />
      <aside
        class="qf-drawer qf-drawer--left qf-tree-drawer"
        role="dialog"
        aria-label="Browse files"
        data-tree-panel
        hidden
      >
        <div class="qf-drawer__header">
          <h2 class="qf-drawer__title">Browse</h2>
          <button
            type="button"
            class="qf-btn qf-btn--ghost qf-btn--icon"
            data-tree-close
            aria-label="Close"
          >
            <svg class="qf-icon qf-icon--sm" aria-hidden="true">
              <use href="#qf-i-x" />
            </svg>
          </button>
        </div>
        <nav class="qf-drawer__body" aria-label="Files">
          <FileTree
            nodes={props.nodes}
            href={props.href}
            currentSlug={props.currentSlug}
            openPaths={props.openPaths}
            linkAttribute="data-tree-link"
          />
        </nav>
      </aside>
    </>
  );
}
