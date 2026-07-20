/**
 * Content-domain contracts shared across the engine.
 */

export interface NoteFrontmatter {
  title?: string;
  date?: string | number | Date;
  tags?: string[] | string;
  aliases?: string[] | string;
  slug?: string;
  permalink?: string;
  draft?: boolean;
  publish?: boolean;
  description?: string;
  cssclasses?: string[] | string;
  [key: string]: unknown;
}

export interface Heading {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  /** Anchor id, produced with github-slugger (matches rendered heading ids). */
  id: string;
}

export interface RawLink {
  /** Target as written inside the brackets, without alias: "Note#Heading". */
  target: string;
  embed: boolean;
}

export interface Note {
  absPath: string;
  /** Vault-relative posix path, NFC-normalized: "guides/setup.md". */
  relPath: string;
  /** Decoded URL path without leading slash: "guides/setup", "한글/소개". */
  slug: string;
  title: string;
  frontmatter: NoteFrontmatter;
  date: Date;
  dateSource: "frontmatter" | "mtime";
  /** Lowercased union of frontmatter tags and inline #tags (nesting kept). */
  tags: string[];
  aliases: string[];
  headings: Heading[];
  /** Wikilink/embed targets as written; resolved against the index in a second pass. */
  rawLinks: RawLink[];
  /** Slugs of notes this note links or embeds (filled by the index). */
  outboundLinks: string[];
  /** Raw targets that failed to resolve (filled by the index). */
  unresolvedLinks: string[];
  /** Slugs of notes this note transcludes (filled by the index). */
  embeds: string[];
  excerpt: string;
  published: boolean;
  mtimeMs: number;
  /** SHA-1 of the raw file bytes; render-cache key component. */
  contentHash: string;
}

export interface TocEntry {
  depth: 2 | 3;
  text: string;
  id: string;
}

export interface RenderedPage {
  /** Article body HTML (goes inside `article.qf-prose`). */
  html: string;
  toc: TocEntry[];
  /** Content hash of the source at render time; render-cache key. */
  contentHash: string;
}

export interface Attachment {
  absPath: string;
  /** Vault-relative posix path, NFC-normalized. */
  relPath: string;
}

export interface SiteIndex {
  /** slug → note (published and unpublished; routes filter on `published`). */
  notes: Map<string, Note>;
  /** Lowercase relPath without ".md" → slug. Folder indexes also register their folder name. */
  byRelPath: Map<string, string>;
  /** Lowercase basename without ".md" → matching byRelPath keys (ambiguity-aware). */
  byBasename: Map<string, string[]>;
  /** Lowercase alias → slug. */
  byAlias: Map<string, string>;
  /** Lowercase basename with extension → candidate attachments (most specific first). */
  attachments: Map<string, Attachment[]>;
  /** tag → slugs of published notes. */
  tags: Map<string, Set<string>>;
  /** slug → slugs of published notes linking to it. */
  backlinks: Map<string, Set<string>>;
  /** slug → slugs of published notes transcluding it. */
  embeddedBy: Map<string, Set<string>>;
  /** Published slugs, frontmatter-dated first, newest first. */
  posts: string[];
  /** Bumped on every applied change batch; invalidates list caches. */
  revision: number;
  warnings: string[];
}
