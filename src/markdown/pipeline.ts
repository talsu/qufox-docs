import { readFile } from "node:fs/promises";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot, RootContent } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { VFile } from "vfile";
import type { Href } from "../site/url.js";
import type { SiteIndex, TocEntry } from "../types.js";
import { remarkBlockIds } from "./ofm/block-ids.js";
import { MAX_EMBED_DEPTH, type RenderContext } from "./ofm/context.js";
import { preprocess } from "./ofm/preprocess.js";
import { sliceByFragment } from "./ofm/transclude.js";
import { remarkWikilinks } from "./ofm/wikilinks.js";
import { rehypeCodeLanguageFallback, rehypeQfClasses } from "./qf-classes.js";
import { extractFenceLanguages, ShikiService } from "./shiki.js";

export interface MarkdownOptions {
  /** Render single newlines as `<br>` (Obsidian's default). */
  breaks: boolean;
  /** Live site index for wikilink and embed resolution. */
  index: SiteIndex;
  /** Site href helper (basePath-aware). */
  href: Href;
}

export interface RenderMarkdownContext {
  title?: string;
  /** Vault-relative path of the note (for relative link resolution). */
  relPath: string;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

/** mdast phase: parse + Obsidian transforms (wikilinks, embeds, block ids). */
function buildMdastProcessor(breaks: boolean) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(breaks ? [remarkBreaks] : [])
    .use(remarkWikilinks)
    .use(remarkBlockIds)
    .freeze();
}

/** hast phase: mdast → hast → heading anchors → syntax highlighting → HTML. */
function buildHastProcessor(shiki: ShikiService) {
  return unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeQfClasses)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["qf-heading-anchor"], ariaHidden: "true", tabIndex: -1 },
      content: { type: "text", value: "#" },
    })
    .use(rehypeCodeLanguageFallback, shiki)
    .use(rehypeShikiFromHighlighter, shiki.highlighter, {
      themes: ShikiService.themes,
      defaultColor: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .freeze();
}

/**
 * The markdown engine, split into two frozen unified processors so note
 * transclusion can recurse through the mdast phase alone.
 */
export class MarkdownRenderer {
  readonly #shiki: ShikiService;
  readonly #index: SiteIndex;
  readonly #href: Href;
  readonly #mdast: ReturnType<typeof buildMdastProcessor>;
  readonly #hast: ReturnType<typeof buildHastProcessor>;

  constructor(shiki: ShikiService, options: MarkdownOptions) {
    this.#shiki = shiki;
    this.#index = options.index;
    this.#href = options.href;
    this.#mdast = buildMdastProcessor(options.breaks);
    this.#hast = buildHastProcessor(shiki);
  }

  static async create(options: MarkdownOptions): Promise<MarkdownRenderer> {
    return new MarkdownRenderer(await ShikiService.create(), options);
  }

  async render(raw: string, context: RenderMarkdownContext): Promise<RenderedMarkdown> {
    const pre = preprocess(raw);
    await this.#shiki.ensureLanguages(extractFenceLanguages(pre));

    const file = new VFile({
      value: pre,
      data: { renderContext: this.#rootContext(context.relPath), pageTitle: context.title },
    });
    const mdast = (await this.#mdast.run(this.#mdast.parse(file), file)) as MdastRoot;
    const hast = (await this.#hast.run(mdast, file)) as HastRoot;
    const html = this.#hast.stringify(hast, file);

    return { html: String(html), toc: (file.data.toc as TocEntry[] | undefined) ?? [] };
  }

  #rootContext(relPath: string): RenderContext {
    return {
      index: this.#index,
      href: this.#href,
      relPath,
      embedDepth: 0,
      embedStack: new Set(),
      loadEmbed: (slug, fragment, parent) => this.#loadEmbed(slug, fragment, parent),
    };
  }

  /** Recursively render an embedded note's body to mdast children. */
  async #loadEmbed(
    slug: string,
    fragment: string | null,
    parent: RenderContext,
  ): Promise<RootContent[] | null> {
    if (parent.embedDepth >= MAX_EMBED_DEPTH || parent.embedStack.has(slug)) return null;
    const note = this.#index.notes.get(slug);
    if (note === undefined || !note.published) return null;

    let raw: string;
    try {
      raw = await readFile(note.absPath, "utf8");
    } catch {
      return null;
    }

    const pre = preprocess(raw);
    await this.#shiki.ensureLanguages(extractFenceLanguages(pre));
    const childContext: RenderContext = {
      index: parent.index,
      href: parent.href,
      relPath: note.relPath,
      embedDepth: parent.embedDepth + 1,
      embedStack: new Set([...parent.embedStack, slug]),
      loadEmbed: parent.loadEmbed,
    };
    const file = new VFile({
      value: pre,
      data: { renderContext: childContext, pageTitle: undefined },
    });
    const tree = (await this.#mdast.run(this.#mdast.parse(file), file)) as MdastRoot;
    return sliceByFragment(tree.children, fragment);
  }
}
