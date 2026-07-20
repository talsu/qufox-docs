import { createHash } from "node:crypto";
import { posix } from "node:path";
import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import type { Heading, Note, NoteFrontmatter, RawLink } from "../types.js";
import type { PublishGate } from "./publish.js";
import { slugForNote, stripMarkdownExt } from "./slugs.js";

/** File extensions treated as attachments when embedded with `![[...]]`. */
export const MEDIA_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "avif",
  "bmp",
  "ico",
  "mp3",
  "ogg",
  "m4a",
  "wav",
  "flac",
  "mp4",
  "webm",
  "mov",
  "pdf",
  "canvas",
]);

const EXCERPT_LENGTH = 200;

export function isMediaTarget(target: string): boolean {
  const extension = posix
    .extname(target.split("#")[0] ?? "")
    .slice(1)
    .toLowerCase();
  return extension !== "" && MEDIA_EXTENSIONS.has(extension);
}

export interface ParseNoteInput {
  absPath: string;
  /** Already normalized (posix, NFC). */
  relPath: string;
  raw: string;
  mtimeMs: number;
}

export interface ParsedNote {
  note: Note;
  warnings: string[];
}

export function parseNote(input: ParseNoteInput, publishGate: PublishGate): ParsedNote {
  const warnings: string[] = [];

  let frontmatter: NoteFrontmatter = {};
  let body = input.raw;
  try {
    const parsed = matter(input.raw);
    frontmatter = parsed.data as NoteFrontmatter;
    body = parsed.content;
  } catch {
    warnings.push(`${input.relPath}: invalid frontmatter YAML, treating it as content`);
  }

  const scan = scanBody(body);
  const basenameTitle = posix.basename(stripMarkdownExt(input.relPath));
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim() !== ""
      ? frontmatter.title.trim()
      : (scan.firstH1 ?? basenameTitle);

  const { date, dateSource } = parseNoteDate(frontmatter, input.mtimeMs, input.relPath, warnings);

  const tags = new Set<string>();
  for (const tag of toStringArray(frontmatter.tags ?? frontmatter.tag)) {
    const cleaned = tag.replace(/^#/, "").toLowerCase();
    if (cleaned !== "") tags.add(cleaned);
  }
  for (const tag of scan.inlineTags) tags.add(tag);

  const aliases = toStringArray(frontmatter.aliases ?? frontmatter.alias);
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description.trim() : "";

  const note: Note = {
    absPath: input.absPath,
    relPath: input.relPath,
    slug: slugForNote(input.relPath, frontmatter),
    title,
    frontmatter,
    date,
    dateSource,
    tags: [...tags],
    aliases,
    headings: scan.headings,
    rawLinks: scan.rawLinks,
    outboundLinks: [],
    unresolvedLinks: [],
    embeds: [],
    excerpt: description !== "" ? description : scan.excerpt,
    published: publishGate(input.relPath, frontmatter),
    mtimeMs: input.mtimeMs,
    contentHash: createHash("sha1").update(input.raw).digest("hex"),
  };
  return { note, warnings };
}

function parseNoteDate(
  frontmatter: NoteFrontmatter,
  mtimeMs: number,
  relPath: string,
  warnings: string[],
): { date: Date; dateSource: Note["dateSource"] } {
  const value = frontmatter.date;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value, dateSource: "frontmatter" };
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return { date: parsed, dateSource: "frontmatter" };
    warnings.push(`${relPath}: unparsable date "${String(value)}", falling back to file mtime`);
  }
  return { date: new Date(mtimeMs), dateSource: "mtime" };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string | number => typeof item === "string" || typeof item === "number",
      )
      .map(String)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }
  if (typeof value === "number") return [String(value)];
  return [];
}

interface BodyScan {
  headings: Heading[];
  rawLinks: RawLink[];
  inlineTags: string[];
  firstH1: string | undefined;
  excerpt: string;
}

const WIKILINK_PATTERN = /(!?)\[\[([^[\]]+?)\]\]/g;
const TAG_PATTERN = /(?:^|[\s(["'{])#([\p{L}\p{N}_/-]+)/gu;
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * One cheap line-oriented pass over the note body, used for the boot index —
 * the unified pipeline is the authority for rendering, this only has to agree
 * with it on the extracted facts (heading ids, link targets, tags).
 */
function scanBody(content: string): BodyScan {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  const rawLinks: RawLink[] = [];
  const inlineTags = new Set<string>();
  let firstH1: string | undefined;

  const excerptLines: string[] = [];
  let excerptDone = false;
  let inFence = false;
  let fenceChar = "`";

  for (const line of content.split("\n")) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? "";
      if (!inFence) {
        inFence = true;
        fenceChar = marker[0] ?? "`";
      } else if (marker[0] === fenceChar) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    // Inline code spans hide links and tags.
    const visible = line.replaceAll(/`[^`]*`/g, " ");

    for (const match of visible.matchAll(WIKILINK_PATTERN)) {
      const inner = match[2] ?? "";
      const target = (inner.split("|")[0] ?? "").trim();
      if (target !== "" || inner.includes("#")) {
        rawLinks.push({ target: target !== "" ? target : inner.trim(), embed: match[1] === "!" });
      }
    }

    // Tags never live inside wikilinks or markdown link destinations.
    const withoutLinks = visible
      .replaceAll(WIKILINK_PATTERN, " ")
      .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replaceAll(/https?:\/\/\S+/g, " ");
    for (const match of withoutLinks.matchAll(TAG_PATTERN)) {
      const tag = match[1] ?? "";
      // Obsidian requires at least one non-numeric character.
      if (/[^\d/]/.test(tag)) inlineTags.add(tag.toLowerCase());
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      const depth = (headingMatch[1]?.length ?? 1) as Heading["depth"];
      const text = stripInlineMarkdown(headingMatch[2] ?? "");
      headings.push({ depth, text, id: slugger.slug(text) });
      if (depth === 1 && firstH1 === undefined) firstH1 = text;
      continue;
    }

    if (!excerptDone) {
      const trimmed = line.trim();
      const isProse =
        trimmed !== "" && !/^([#>|*+-]|\d+\.|!\[\[|\[\[.*\]\]$|---|===)/.test(trimmed);
      if (isProse) {
        excerptLines.push(trimmed);
      } else if (excerptLines.length > 0) {
        excerptDone = true;
      }
    }
  }

  return {
    headings,
    rawLinks,
    inlineTags: [...inlineTags],
    firstH1,
    excerpt: truncate(stripInlineMarkdown(excerptLines.join(" ")), EXCERPT_LENGTH),
  };
}

function stripInlineMarkdown(text: string): string {
  return text
    .replaceAll(/!?\[\[([^[\]|]+)\|([^[\]]+)\]\]/g, "$2")
    .replaceAll(/!?\[\[([^[\]]+)\]\]/g, "$1")
    .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replaceAll(/(\*\*|__|==|~~)/g, "")
    .replaceAll(/(^|[^\w])[*_](\S(?:[^*_]*\S)?)[*_]/g, "$1$2")
    .replaceAll("`", "")
    .replaceAll(/%%[^%]*%%/g, "")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}
