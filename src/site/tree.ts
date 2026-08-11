import { stripMarkdownExt } from "../content/slugs.js";
import type { SiteIndex } from "../types.js";

/** A published note, as a leaf of the folder tree. */
export interface TreeNoteNode {
  kind: "note";
  /** File name without ".md", as written in the vault. */
  name: string;
  slug: string;
  title: string;
}

/** A folder holding notes and/or other folders. */
export interface TreeFolderNode {
  kind: "folder";
  name: string;
  /** Vault-relative folder path ("interior", "areas/interior"). */
  path: string;
  children: TreeNode[];
  /** Published notes anywhere beneath this folder. */
  noteCount: number;
}

export type TreeNode = TreeFolderNode | TreeNoteNode;

interface FolderDraft {
  name: string;
  path: string;
  folders: Map<string, FolderDraft>;
  notes: TreeNoteNode[];
}

/**
 * The vault's folder structure over published notes, for browsing the site the
 * way the files are organized on disk. Unpublished notes are left out, so every
 * row in the tree links somewhere; folders that end up empty disappear with them.
 */
export function buildNoteTree(index: SiteIndex): TreeNode[] {
  const root: FolderDraft = { name: "", path: "", folders: new Map(), notes: [] };

  for (const note of index.notes.values()) {
    if (!note.published) continue;

    const segments = note.relPath.split("/");
    const fileName = stripMarkdownExt(segments.pop() ?? "");
    if (fileName === "") continue;

    let folder = root;
    for (const segment of segments) {
      const path = folder.path === "" ? segment : `${folder.path}/${segment}`;
      let child = folder.folders.get(segment);
      if (child === undefined) {
        child = { name: segment, path, folders: new Map(), notes: [] };
        folder.folders.set(segment, child);
      }
      folder = child;
    }

    folder.notes.push({ kind: "note", name: fileName, slug: note.slug, title: note.title });
  }

  return finalize(root).children;
}

/** Depth-first: sort folders before notes, each alphabetically, and count notes. */
function finalize(draft: FolderDraft): { children: TreeNode[]; noteCount: number } {
  const folders = [...draft.folders.values()]
    .map((child) => {
      const { children, noteCount } = finalize(child);
      return { kind: "folder", name: child.name, path: child.path, children, noteCount } as const;
    })
    .filter((folder) => folder.noteCount > 0)
    .sort((a, b) => byName(a.name, b.name));

  const notes = [...draft.notes].sort(
    (a, b) => overviewFirst(a.name) - overviewFirst(b.name) || byName(a.name, b.name),
  );
  const noteCount = notes.length + folders.reduce((sum, folder) => sum + folder.noteCount, 0);

  return { children: [...folders, ...notes], noteCount };
}

/** A folder's own overview note leads its siblings, the way you would read it. */
function overviewFirst(name: string): 0 | 1 {
  const lower = name.toLowerCase();
  return lower === "index" || lower === "readme" ? 0 : 1;
}

/** Natural order, case- and accent-insensitive, so "img10" follows "img9". */
function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

const cache = new WeakMap<SiteIndex, { revision: number; tree: TreeNode[] }>();

/** `buildNoteTree`, memoized per index revision (every page renders the tree). */
export function noteTree(index: SiteIndex): TreeNode[] {
  const hit = cache.get(index);
  if (hit !== undefined && hit.revision === index.revision) return hit.tree;

  const tree = buildNoteTree(index);
  cache.set(index, { revision: index.revision, tree });
  return tree;
}

/** Vault-relative folder paths containing the note, outermost first. */
export function ancestorPaths(relPath: string): string[] {
  const segments = relPath.split("/").slice(0, -1);
  const paths: string[] = [];
  let path = "";
  for (const segment of segments) {
    path = path === "" ? segment : `${path}/${segment}`;
    paths.push(path);
  }
  return paths;
}
