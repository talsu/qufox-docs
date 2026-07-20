import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { MarkdownRenderer } from "../../src/markdown/pipeline.js";
import { indexFromFiles, makeRenderer, tempVault } from "../helpers/markdown.js";

const fixturesDir = fileURLToPath(new URL("../../fixtures/ofm", import.meta.url));
const fixtures = readdirSync(fixturesDir).filter((name) => name.endsWith(".md"));

let renderer: MarkdownRenderer;

beforeAll(async () => {
  renderer = await makeRenderer(indexFromFiles({}));
});

async function render(raw: string, relPath = "test.md"): Promise<string> {
  return (await renderer.render(raw, { relPath })).html;
}

describe("markdown pipeline snapshots (qf markup contract)", () => {
  it.each(fixtures)("%s", async (name) => {
    const raw = readFileSync(`${fixturesDir}/${name}`, "utf8");
    const { html } = await renderer.render(raw, { relPath: name });
    await expect(html).toMatchFileSnapshot(`__snapshots__/ofm/${name.replace(/\.md$/, "")}.html`);
  });
});

describe("markdown pipeline behavior", () => {
  it("collects a table of contents from h2/h3 with duplicate-safe ids", async () => {
    const raw = readFileSync(`${fixturesDir}/headings.md`, "utf8");
    const { toc } = await renderer.render(raw, { relPath: "headings.md" });
    expect(toc).toEqual([
      { depth: 2, text: "Section", id: "section" },
      { depth: 3, text: "Sub section", id: "sub-section" },
      { depth: 2, text: "Section", id: "section-1" },
    ]);
  });

  it("does not leak frontmatter into the output", async () => {
    const html = await render("---\ntitle: Hidden\n---\n\nBody.");
    expect(html).not.toContain("Hidden");
    expect(html).toContain("Body.");
  });

  it("highlights known languages with dual-theme variables", async () => {
    const html = await render("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
    expect(html).toContain("--shiki-light");
    expect(html).toContain("--shiki-dark");
  });

  it("renders unknown languages as plaintext instead of failing", async () => {
    const html = await render("```definitely-not-a-language\nhello\n```");
    expect(html).toContain("hello");
  });

  it("strips %% comments and rewrites inline footnotes", async () => {
    const html = await render("Visible %%secretcomment%% text with a note^[side remark].");
    expect(html).not.toContain("secretcomment");
    expect(html).toContain("side remark");
    expect(html).toContain("fn-inline-1");
  });

  it("keeps %% inside code fences intact", async () => {
    const html = await render("```\nkeep %%this%% literal\n```");
    expect(html).toContain("%%this%%");
  });

  it("respects the breaks option", async () => {
    const withBreaks = await render("one\ntwo");
    expect(withBreaks).toContain("<br>");

    const strict = await makeRenderer(indexFromFiles({}), { breaks: false });
    const withoutBreaks = await strict.render("one\ntwo", { relPath: "test.md" });
    expect(withoutBreaks.html).not.toContain("<br>");
  });
});

describe("wikilinks and embeds (resolution)", () => {
  const vault = {
    "hello.md": "---\ntitle: Hello\n---\n\nHome.",
    "guides/setup.md": "# Setup\n\n## Install\n\nSteps.",
    "aliased.md": "---\naliases: [nickname]\n---\n\nAliased.",
  };

  it("renders resolved wikilinks with the qf-wikilink class and note title", async () => {
    const r = await makeRenderer(indexFromFiles(vault));
    const html = (await r.render("Go to [[hello]] now.", { relPath: "x.md" })).html;
    expect(html).toContain('class="qf-wikilink"');
    expect(html).toContain(">Hello<");
    expect(html).toContain('href="/hello"');
  });

  it("honors aliases in link text and target resolution", async () => {
    const r = await makeRenderer(indexFromFiles(vault));
    const html = (await r.render("[[hello|greeting]] and [[nickname]]", { relPath: "x.md" })).html;
    expect(html).toContain(">greeting<");
    expect(html).toContain('href="/aliased"');
  });

  it("resolves heading fragments to anchor ids", async () => {
    const r = await makeRenderer(indexFromFiles(vault));
    const html = (await r.render("[[guides/setup#Install]]", { relPath: "x.md" })).html;
    expect(html).toContain('href="/guides/setup#install"');
  });

  it("marks unresolved links distinctly with no href", async () => {
    const r = await makeRenderer(indexFromFiles(vault));
    const html = (await r.render("[[does-not-exist]]", { relPath: "x.md" })).html;
    expect(html).toContain('class="qf-link--unresolved"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/qf-link--unresolved[^>]*href/);
  });

  it("renders media embeds as sized images", async () => {
    const r = await makeRenderer(indexFromFiles(vault, ["assets/fox.png"]));
    const html = (await r.render("![[fox.png|300x200]]", { relPath: "x.md" })).html;
    expect(html).toContain('src="/assets/vault/assets/fox.png"');
    expect(html).toContain('width="300"');
    expect(html).toContain('height="200"');
    expect(html).toContain('loading="lazy"');
  });
});

describe("note transclusion (real files)", () => {
  it("transcludes a standalone note embed into a qf-transclude block", async () => {
    const { renderer, relPath } = await tempVault({
      "note.md": "Intro.\n\n![[hello]]\n",
      "hello.md": "---\ntitle: Hello\n---\n\nEmbedded home body.",
    });
    const html = (await renderer.render("Intro.\n\n![[hello]]\n", { relPath })).html;
    expect(html).toContain('class="qf-transclude"');
    expect(html).toContain('class="qf-transclude__source"');
    expect(html).toContain("Embedded home body.");
  });

  it("terminates on transclusion cycles instead of hanging", async () => {
    const { renderer } = await tempVault({
      "cycle-a.md": "![[cycle-b]]\n",
      "cycle-b.md": "![[cycle-a]]\n",
    });
    const html = (await renderer.render("![[cycle-b]]\n", { relPath: "cycle-a.md" })).html;
    expect(html).toContain('class="qf-transclude"');
  });
});

describe("block ids", () => {
  it("turns trailing ^id markers into element ids", async () => {
    const html = await render("A quotable line. ^quote-1");
    expect(html).toContain('id="block-quote-1"');
    expect(html).not.toContain("^quote-1");
  });
});

describe("callouts", () => {
  it("renders a callout with the type modifier, sprite icon, and title", async () => {
    const html = await render("> [!tip] Fast path\n> Body.");
    expect(html).toContain('class="qf-callout qf-callout--tip"');
    expect(html).toContain('class="qf-callout__title"');
    expect(html).toContain('href="#qf-i-sparkle"');
    expect(html).toContain("Fast path");
    expect(html).toContain('class="qf-callout__body"');
  });

  it("defaults the title to the type when none is given", async () => {
    const html = await render("> [!warning]\n> Careful.");
    expect(html).toContain("qf-callout--warning");
    expect(html).toContain(">Warning<");
  });

  it("renders foldable callouts as details/summary", async () => {
    const collapsed = await render("> [!note]- Collapsed\n> Body.");
    expect(collapsed).toContain("<details");
    expect(collapsed).toContain("<summary");
    expect(collapsed).not.toMatch(/<details[^>]*\bopen\b/);

    const expanded = await render("> [!note]+ Expanded\n> Body.");
    expect(expanded).toMatch(/<details[^>]*\bopen\b/);
  });

  it("maps aliases to the canonical type", async () => {
    const html = await render("> [!summary] TLDR\n> Short.");
    expect(html).toContain("qf-callout--abstract");
  });

  it("falls back to note for unknown types", async () => {
    const html = await render("> [!nonsense] Huh\n> Body.");
    expect(html).toContain("qf-callout--note");
  });

  it("nests callouts", async () => {
    const html = await render("> [!note] Outer\n>\n> > [!info] Inner\n> > Nested.");
    expect(html).toContain("qf-callout--note");
    expect(html).toContain("qf-callout--info");
  });
});

describe("marks, tags, and unsupported blocks", () => {
  it("renders ==highlights== as mark elements", async () => {
    const html = await render("A ==highlighted== phrase.");
    expect(html).toContain("<mark>highlighted</mark>");
  });

  it("links inline #tags to their tag pages", async () => {
    const html = await render("A #project and a #inbox/to-read tag.");
    expect(html).toContain('class="qf-tag"');
    expect(html).toContain('href="/tags/project"');
    expect(html).toContain('href="/tags/inbox/to-read"');
    expect(html).toContain(">#project<");
  });

  it("ignores digit-only tags and tags inside code", async () => {
    const html = await render("Not #1984 and `#nope` and\n```\n#fenced\n```");
    expect(html).not.toContain('href="/tags/1984"');
    expect(html).not.toContain('href="/tags/nope"');
    expect(html).not.toContain('href="/tags/fenced"');
  });

  it("replaces unsupported code blocks with a warning callout", async () => {
    const { html, warnings } = await renderer.render("```mermaid\ngraph TD; A-->B;\n```", {
      relPath: "x.md",
    });
    expect(html).toContain("qf-callout--warning");
    expect(html).toContain("qufox-docs");
    expect(html).not.toContain("graph TD");
    expect(warnings.some((w) => w.includes("mermaid"))).toBe(true);
  });
});
