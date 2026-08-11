import type { TreeNode } from "../tree.js";
import type { Href } from "../url.js";

export interface FileTreeProps {
  nodes: TreeNode[];
  href: Href;
  /** Slug of the note being viewed, marked and revealed in the tree. */
  currentSlug?: string | undefined;
  /** Folder paths to render expanded (the current note's ancestors). */
  openPaths?: ReadonlySet<string> | undefined;
  /** Marks links so the drawer can close itself on navigation. */
  linkAttribute?: string | undefined;
}

/**
 * The vault folder structure as a nested list. Folders are `<details>`, so
 * expanding and collapsing works without JavaScript and survives static export;
 * the current note's ancestors start open.
 */
export function FileTree(props: FileTreeProps) {
  if (props.nodes.length === 0) {
    return (
      <div class="qf-empty">
        <div class="qf-empty__title">Nothing to browse</div>
        <div class="qf-empty__body">Published notes appear here in their folder structure.</div>
      </div>
    );
  }
  return <TreeList {...props} />;
}

function TreeList(props: FileTreeProps) {
  return (
    <ul class="qf-tree">
      {props.nodes.map((node) =>
        node.kind === "folder" ? (
          <li class="qf-tree__item">
            <details class="qf-tree__folder" open={props.openPaths?.has(node.path) ?? false}>
              <summary class="qf-tree__summary">
                <svg class="qf-icon qf-icon--sm qf-tree__chevron" aria-hidden="true">
                  <use href="#qf-i-chevron-right" />
                </svg>
                <span class="qf-tree__name">{node.name}</span>
                <span class="qf-tree__count">{node.noteCount}</span>
              </summary>
              <TreeList {...props} nodes={node.children} />
            </details>
          </li>
        ) : (
          <li class="qf-tree__item">
            <a
              class="qf-tree__link"
              href={props.href(node.slug)}
              title={`${node.name}.md`}
              aria-current={node.slug === props.currentSlug ? "page" : undefined}
              {...(props.linkAttribute !== undefined ? { [props.linkAttribute]: "" } : {})}
            >
              <svg class="qf-icon qf-icon--sm qf-tree__icon" aria-hidden="true">
                <use href="#qf-i-file-text" />
              </svg>
              <span class="qf-tree__name">{node.title}</span>
            </a>
          </li>
        ),
      )}
    </ul>
  );
}
