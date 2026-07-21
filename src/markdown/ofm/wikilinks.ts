import type { Html, Image, Paragraph, Parent, PhrasingContent, Root, RootContent } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { isMediaTarget } from "../../content/note.js";
import {
  resolveAttachment,
  resolveFragmentAnchor,
  resolveLinkTarget,
  splitTarget,
} from "../../content/resolve.js";
import { relPathKey } from "../../content/slugs.js";
import type { Note } from "../../types.js";
import { getRenderContext, type RenderContext } from "./context.js";

/** `[[link]]`, `[[link|alias]]`, `![[embed]]`, `![[embed|size]]`. */
const WIKILINK_PATTERN = /(!?)\[\[([^\]\n]+?)\]\]/g;

/**
 * Resolve Obsidian wikilinks and embeds against the live site index:
 * transclude note embeds as block quotes, turn media embeds into media
 * elements, and rewrite links (marking unresolved ones distinctly).
 */
export function remarkWikilinks() {
  return async (tree: Root, file: VFile): Promise<void> => {
    const context = getRenderContext(file);
    await transcludeNoteEmbeds(tree, context);
    resolveMarkdownLinks(tree, context);
    resolveMarkdownImages(tree, context);
    findAndReplace(tree, [
      [
        WIKILINK_PATTERN,
        (_full, bang: string, inner: string) => replaceInline(bang, inner, context),
      ],
    ]);
  };
}

// Absolute URLs, protocol/protocol-relative, root-absolute paths, and bare anchors.
const NON_RELATIVE = /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i;

/**
 * Rewrite Markdown links that point at another note (e.g. `[text](note.md)` or
 * `[text](sub/note.md#heading)`) to the note's slug URL, the same way wikilinks
 * resolve. Links to non-notes (images, external files) are left untouched.
 */
function resolveMarkdownLinks(tree: Root, context: RenderContext): void {
  visit(tree, "link", (node) => {
    if (node.url === "" || NON_RELATIVE.test(node.url)) return;
    const className = (node.data?.hProperties as { className?: unknown } | undefined)?.className;
    if (Array.isArray(className) && className.includes("qf-wikilink")) return;

    let decoded = node.url;
    try {
      decoded = decodeURIComponent(node.url);
    } catch {
      // keep the raw value if it is not valid percent-encoding
    }
    const { base, fragment } = splitTarget(decoded);
    if (base === "") return;

    const resolved = resolveLinkTarget(context.index, context.relPath, base);
    if (resolved.kind !== "note") return;

    const note = context.index.notes.get(resolved.slug);
    const anchor =
      fragment !== null
        ? ((note !== undefined ? resolveFragmentAnchor(note, fragment) : null) ??
          slugAnchor(fragment))
        : null;
    node.url = context.href(resolved.slug) + (anchor !== null ? `#${anchor}` : "");
    const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
    const props = data.hProperties ?? {};
    props.className = ["qf-wikilink"];
    data.hProperties = props;
    node.data = data as typeof node.data;
  });
}

/** Obsidian size hint at the end of an image's alt text: `|W` or `|WxH`. */
const IMAGE_SIZE_HINT = /^(.*)\|(\d+(?:x\d+)?)$/s;

/**
 * Rewrite standard Markdown images that point at a vault attachment (e.g.
 * `![alt](img/photo.png)` or `![alt](../assets/photo.png)`) to the served asset
 * URL, the same way `![[photo.png]]` embeds resolve, and apply any Obsidian size
 * hint (`![alt|300](url)`, `![alt|300x200](url)`) as width/height. Absolute and
 * external image URLs, and paths that match no attachment, keep their URL; the
 * size hint still applies to them.
 */
function resolveMarkdownImages(tree: Root, context: RenderContext): void {
  visit(tree, "image", (node) => {
    applyObsidianSize(node);

    if (node.url === "" || NON_RELATIVE.test(node.url)) return;

    let decoded = node.url;
    try {
      decoded = decodeURIComponent(node.url);
    } catch {
      // keep the raw value if it is not valid percent-encoding
    }
    const attachment = resolveAttachment(context.index, decoded);
    if (attachment === null) return;
    node.url = context.href(`assets/vault/${attachment.relPath}`);
  });
}

/**
 * Apply an Obsidian image size hint written at the end of the alt text — as in
 * `![alt|300](url)` or `![alt|300x200](url)` — as width/height, mirroring how
 * `![[img|300]]` embeds size their media. A `|…` suffix that is not numeric is
 * left untouched as alt text.
 */
function applyObsidianSize(node: Image): void {
  if (node.alt === null || node.alt === undefined) return;
  const match = node.alt.match(IMAGE_SIZE_HINT);
  if (match === null) return;
  const { width, height } = parseSize(match[2]);
  if (width === undefined) return;

  node.alt = (match[1] ?? "").replace(/\s+$/, "");
  const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
  const props = data.hProperties ?? {};
  props.width = width;
  if (height !== undefined) props.height = height;
  data.hProperties = props;
  node.data = data as typeof node.data;
}

/**
 * Replace paragraphs that consist solely of a note embed with a transclusion
 * block. Media embeds and inline embeds are left to the inline pass.
 */
async function transcludeNoteEmbeds(tree: Root, context: RenderContext): Promise<void> {
  const targets: Array<{ parent: Parent; index: number; base: string; fragment: string | null }> =
    [];

  visit(tree, "paragraph", (node: Paragraph, index, parent: Parent | undefined) => {
    if (parent === undefined || index === undefined || node.children.length !== 1) return;
    const child = node.children[0];
    if (child?.type !== "text") return;
    const match = child.value.trim().match(/^!\[\[([^\]\n]+?)\]\]$/);
    if (match === null) return;
    const inner = match[1] ?? "";
    const { base, fragment } = splitTarget(inner.split("|")[0] ?? "");
    if (base === "" || isMediaTarget(base)) return;
    targets.push({ parent, index, base, fragment });
  });

  // Resolve bottom-up so splicing does not shift earlier indices.
  for (const target of targets.reverse()) {
    const resolved = resolveLinkTarget(context.index, context.relPath, target.base);
    if (resolved.kind !== "note") continue;
    const children = await context.loadEmbed(resolved.slug, target.fragment, context);
    const note = context.index.notes.get(resolved.slug);
    if (children === null || note === undefined) continue;
    target.parent.children.splice(target.index, 1, transclusionNode(note, children, context));
  }
}

function transclusionNode(
  note: Note,
  children: RootContent[],
  context: RenderContext,
): RootContent {
  const source: PhrasingContent = {
    type: "link",
    url: context.href(note.slug),
    children: [{ type: "text", value: note.slug }],
  };
  return {
    type: "blockquote",
    data: { hProperties: { className: ["qf-transclude"] } },
    children: [
      {
        type: "paragraph",
        data: { hProperties: { className: ["qf-transclude__source"] } },
        children: [source],
      },
      ...(children as Paragraph[]),
    ],
  };
}

function replaceInline(
  bang: string,
  inner: string,
  context: RenderContext,
): PhrasingContent | PhrasingContent[] | false {
  const isEmbed = bang === "!";
  const [rawTarget, alias] = splitAlias(inner);

  if (isEmbed && isMediaTarget(rawTarget)) {
    return mediaNode(rawTarget, alias, context) ?? unresolvedNode(inner);
  }

  const resolved = resolveLinkTarget(context.index, context.relPath, rawTarget);
  if (resolved.kind === "unresolved") {
    return unresolvedNode(alias ?? rawTarget);
  }

  if (resolved.kind === "anchor") {
    const anchor = currentNoteAnchor(context, resolved.fragment);
    return linkNode(`#${anchor ?? slugAnchor(resolved.fragment)}`, alias ?? resolved.fragment);
  }

  const note = context.index.notes.get(resolved.slug);
  const fragmentId =
    resolved.fragment !== null && note !== undefined
      ? resolveFragmentAnchor(note, resolved.fragment)
      : null;
  const url = context.href(resolved.slug) + (fragmentId !== null ? `#${fragmentId}` : "");
  const display = alias ?? note?.title ?? resolved.slug;
  return linkNode(url, display);
}

function splitAlias(inner: string): [string, string | undefined] {
  const pipe = inner.indexOf("|");
  if (pipe === -1) return [inner.trim(), undefined];
  const alias = inner.slice(pipe + 1).trim();
  return [inner.slice(0, pipe).trim(), alias === "" ? undefined : alias];
}

function linkNode(url: string, text: string): PhrasingContent {
  return {
    type: "link",
    url,
    children: [{ type: "text", value: text }],
    data: { hProperties: { className: ["qf-wikilink"] } },
  };
}

/** Unresolved links carry no href; a raw anchor renders the distinct state reliably. */
function unresolvedNode(text: string): Html {
  return {
    type: "html",
    value: `<a class="qf-link--unresolved" role="link" aria-disabled="true">${escapeHtml(text)}</a>`,
  };
}

function mediaNode(
  rawTarget: string,
  sizeSpec: string | undefined,
  context: RenderContext,
): PhrasingContent | null {
  const attachment = resolveAttachment(context.index, rawTarget);
  if (attachment === null) return null;
  const url = context.href(`assets/vault/${attachment.relPath}`);
  const extension = rawTarget.split(".").pop()?.toLowerCase() ?? "";
  const name = rawTarget.split("/").pop() ?? rawTarget;

  if (["mp3", "ogg", "m4a", "wav", "flac"].includes(extension)) {
    return { type: "html", value: `<audio controls src="${escapeHtml(url)}"></audio>` };
  }
  if (["mp4", "webm", "mov"].includes(extension)) {
    return { type: "html", value: `<video controls src="${escapeHtml(url)}"></video>` };
  }
  if (extension === "pdf" || extension === "canvas") {
    return linkNode(url, name);
  }

  const { width, height } = parseSize(sizeSpec);
  const image: Image = {
    type: "image",
    url,
    alt: name,
    data: {
      hProperties: {
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        loading: "lazy",
        decoding: "async",
      },
    },
  };
  return image;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseSize(spec: string | undefined): { width?: number; height?: number } {
  if (spec === undefined) return {};
  const match = spec.match(/^(\d+)(?:x(\d+))?$/);
  if (match === null) return {};
  const width = Number(match[1]);
  const height = match[2] !== undefined ? Number(match[2]) : undefined;
  return height !== undefined ? { width, height } : { width };
}

/** Resolve a same-page `[[#heading]]` anchor against the current note. */
function currentNoteAnchor(context: RenderContext, fragment: string): string | null {
  const slug = context.index.byRelPath.get(relPathKey(context.relPath));
  const note = slug !== undefined ? context.index.notes.get(slug) : undefined;
  return note !== undefined ? resolveFragmentAnchor(note, fragment) : null;
}

function slugAnchor(fragment: string): string {
  return fragment
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
