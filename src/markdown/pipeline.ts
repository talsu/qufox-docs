import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
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
import type { TocEntry } from "../types.js";
import { rehypeCodeLanguageFallback, rehypeQfClasses } from "./qf-classes.js";
import { extractFenceLanguages, ShikiService } from "./shiki.js";

export interface MarkdownOptions {
  /** Render single newlines as `<br>` (Obsidian's default). */
  breaks: boolean;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

/**
 * The unified pipeline turning one markdown document into article HTML.
 * Stage order matters:
 * frontmatter/GFM parsing → hast (raw HTML preserved) → heading ids →
 * qf-* classes + toc → heading anchors → syntax highlighting → HTML.
 */
export class MarkdownRenderer {
  readonly #processor: ReturnType<MarkdownRenderer["buildProcessor"]>;
  readonly #shiki: ShikiService;

  private constructor(shiki: ShikiService, options: MarkdownOptions) {
    this.#shiki = shiki;
    this.#processor = this.buildProcessor(options);
  }

  static async create(options: MarkdownOptions): Promise<MarkdownRenderer> {
    return new MarkdownRenderer(await ShikiService.create(), options);
  }

  private buildProcessor(options: MarkdownOptions) {
    return unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkGfm)
      .use(options.breaks ? [remarkBreaks] : [])
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(rehypeQfClasses)
      .use(rehypeAutolinkHeadings, {
        behavior: "append",
        properties: { className: ["qf-heading-anchor"], ariaHidden: "true", tabIndex: -1 },
        content: { type: "text", value: "#" },
      })
      .use(rehypeCodeLanguageFallback, this.#shiki)
      .use(rehypeShikiFromHighlighter, this.#shiki.highlighter, {
        themes: ShikiService.themes,
        defaultColor: false,
      })
      .use(rehypeStringify)
      .freeze();
  }

  async render(raw: string): Promise<RenderedMarkdown> {
    await this.#shiki.ensureLanguages(extractFenceLanguages(raw));
    const file = await this.#processor.process(raw);
    return {
      html: String(file),
      toc: (file.data.toc as TocEntry[] | undefined) ?? [],
    };
  }
}
