import { bundledLanguages, bundledThemes } from "shiki";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/** Languages shiki renders as plain text without loading a grammar. */
const PLAIN_LANGUAGES = new Set(["text", "txt", "plaintext", "plain", "ansi"]);

/** Grammars loaded at boot; everything else loads lazily on first sight. */
const PRELOADED_LANGUAGES = [
  "javascript",
  "typescript",
  "tsx",
  "json",
  "bash",
  "css",
  "html",
  "yaml",
  "markdown",
  "diff",
] as const;

const FENCE_LANGUAGE_PATTERN = /^ {0,3}(?:`{3,}|~{3,})\s*([^\s`{]+)/gm;

/** Extract fence info strings so their grammars can be loaded before rendering. */
export function extractFenceLanguages(raw: string): string[] {
  const languages = new Set<string>();
  for (const match of raw.matchAll(FENCE_LANGUAGE_PATTERN)) {
    const language = match[1]?.toLowerCase();
    if (language !== undefined) languages.add(language);
  }
  return [...languages];
}

/**
 * Singleton highlighter with the JavaScript regex engine (no WASM) and
 * dual-theme output (`--shiki-light`/`--shiki-dark` variables, switched by
 * the site's `[data-theme]`).
 */
export class ShikiService {
  static readonly themes = { light: "github-light", dark: "github-dark" } as const;

  readonly #loaded = new Set<string>(PLAIN_LANGUAGES);

  private constructor(readonly highlighter: HighlighterCore) {
    for (const language of highlighter.getLoadedLanguages()) this.#loaded.add(language);
  }

  static async create(): Promise<ShikiService> {
    const highlighter = await createHighlighterCore({
      themes: [
        bundledThemes[ShikiService.themes.light](),
        bundledThemes[ShikiService.themes.dark](),
      ],
      langs: PRELOADED_LANGUAGES.map((language) => bundledLanguages[language]()),
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
    return new ShikiService(highlighter);
  }

  isRenderable(language: string): boolean {
    return this.#loaded.has(language.toLowerCase());
  }

  /** Load any not-yet-loaded grammars; unknown languages are left to the fallback pass. */
  async ensureLanguages(languages: string[]): Promise<void> {
    for (const language of languages) {
      const key = language.toLowerCase();
      if (this.#loaded.has(key)) continue;
      const importer = (bundledLanguages as Record<string, (() => Promise<unknown>) | undefined>)[
        key
      ];
      if (importer === undefined) continue;
      await this.highlighter.loadLanguage(
        (await importer()) as Parameters<HighlighterCore["loadLanguage"]>[0],
      );
      this.#loaded.add(key);
      for (const loaded of this.highlighter.getLoadedLanguages()) this.#loaded.add(loaded);
    }
  }
}
