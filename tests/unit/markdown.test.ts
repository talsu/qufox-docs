import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "../../src/markdown/pipeline.js";

const fixturesDir = fileURLToPath(new URL("../../fixtures/ofm", import.meta.url));
const fixtures = readdirSync(fixturesDir).filter((name) => name.endsWith(".md"));

let renderer: MarkdownRenderer;

beforeAll(async () => {
  renderer = await MarkdownRenderer.create({ breaks: true });
});

describe("markdown pipeline snapshots (qf markup contract)", () => {
  it.each(fixtures)("%s", async (name) => {
    const raw = readFileSync(`${fixturesDir}/${name}`, "utf8");
    const { html } = await renderer.render(raw);
    await expect(html).toMatchFileSnapshot(`__snapshots__/ofm/${name.replace(/\.md$/, "")}.html`);
  });
});

describe("markdown pipeline behavior", () => {
  it("collects a table of contents from h2/h3 with duplicate-safe ids", async () => {
    const raw = readFileSync(`${fixturesDir}/headings.md`, "utf8");
    const { toc } = await renderer.render(raw);
    expect(toc).toEqual([
      { depth: 2, text: "Section", id: "section" },
      { depth: 3, text: "Sub section", id: "sub-section" },
      { depth: 2, text: "Section", id: "section-1" },
    ]);
  });

  it("does not leak frontmatter into the output", async () => {
    const { html } = await renderer.render("---\ntitle: Hidden\n---\n\nBody.");
    expect(html).not.toContain("Hidden");
    expect(html).toContain("Body.");
  });

  it("highlights known languages with dual-theme variables", async () => {
    const { html } = await renderer.render("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
    expect(html).toContain("--shiki-light");
    expect(html).toContain("--shiki-dark");
  });

  it("renders unknown languages as plaintext instead of failing", async () => {
    const { html } = await renderer.render("```definitely-not-a-language\nhello\n```");
    expect(html).toContain("hello");
  });

  it("respects the breaks option", async () => {
    const withBreaks = await renderer.render("one\ntwo");
    expect(withBreaks.html).toContain("<br>");

    const strict = await MarkdownRenderer.create({ breaks: false });
    const withoutBreaks = await strict.render("one\ntwo");
    expect(withoutBreaks.html).not.toContain("<br>");
  });
});
