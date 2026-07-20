import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { scanVault } from "../../src/content/scan.js";
import { buildSiteIndex } from "../../src/content/site-index.js";
import type { SiteIndex } from "../../src/types.js";

const vaultDir = fileURLToPath(new URL("../../fixtures/vault", import.meta.url));

let index: SiteIndex;

beforeAll(async () => {
  index = buildSiteIndex(await scanVault(vaultDir), {
    publish: { mode: "opt-out", exclude: [] },
  });
});

describe("buildSiteIndex on the fixture vault", () => {
  it("indexes every markdown file, including unicode paths", () => {
    expect(index.notes.get("hello-world")).toBeDefined();
    expect(index.notes.get("guides/setup")).toBeDefined();
    expect(index.notes.get("guides")).toBeDefined(); // guides/index.md folded
    expect(index.notes.get("한글/소개")).toBeDefined();
    expect(index.notes.size).toBe(10);
  });

  it("marks drafts and hidden folders as unpublished", () => {
    expect(index.notes.get("drafts-note")?.published).toBe(false);
    expect(index.notes.get("_private/secret")?.published).toBe(false);
    expect(index.notes.get("hello-world")?.published).toBe(true);
  });

  it("collects frontmatter and inline tags", () => {
    expect([...(index.tags.get("intro") ?? [])]).toEqual(["hello-world"]);
    expect([...(index.tags.get("inline-tag") ?? [])]).toEqual(["guides/setup"]);
    expect([...(index.tags.get("한글태그") ?? [])]).toEqual(["한글/소개"]);
  });

  it("ignores links and tags inside code fences", () => {
    const setup = index.notes.get("guides/setup");
    expect(setup?.rawLinks.map((l) => l.target)).not.toContain("not-a-link");
    expect(index.tags.has("not-a-tag")).toBe(false);
  });

  it("builds backlinks from links, aliases, and embeds", () => {
    const backlinks = index.backlinks.get("hello-world");
    expect(backlinks).toBeDefined();
    expect([...(backlinks ?? [])].sort()).toEqual(["guides/setup", "media-note", "한글/소개"]);
    // hello-world links [[nickname]] → aliased note
    expect([...(index.backlinks.get("aliased") ?? [])]).toEqual(["hello-world"]);
  });

  it("tracks note transclusions in embeddedBy", () => {
    expect([...(index.embeddedBy.get("hello-world") ?? [])]).toEqual(["media-note"]);
  });

  it("records unresolved links", () => {
    expect(index.notes.get("guides/advanced/deep-dive")?.unresolvedLinks).toEqual(["no-such-note"]);
  });

  it("reproduces duplicate heading anchors", () => {
    const headings = index.notes.get("guides/setup")?.headings ?? [];
    const ids = headings.filter((h) => h.text === "Install").map((h) => h.id);
    expect(ids).toEqual(["install", "install-1"]);
  });

  it("indexes attachments by basename", () => {
    expect(index.attachments.get("fox.png")?.[0]?.relPath).toBe("attachments/fox.png");
  });

  it("orders posts by frontmatter date, mtime-dated notes last", () => {
    const frontmatterDated = [
      "media-note",
      "guides/advanced/deep-dive",
      "guides/setup",
      "한글/소개",
      "hello-world",
      "aliased",
    ];
    expect(index.posts.slice(0, frontmatterDated.length)).toEqual(frontmatterDated);
    // The remaining published posts are mtime-dated; order depends on checkout time.
    expect(new Set(index.posts.slice(frontmatterDated.length))).toEqual(
      new Set(["guides", "journal/2026-07-20"]),
    );
  });

  it("derives titles from frontmatter, first H1, then filename", () => {
    expect(index.notes.get("hello-world")?.title).toBe("Hello World");
    expect(index.notes.get("guides/setup")?.title).toBe("Setup");
    expect(index.notes.get("journal/2026-07-20")?.title).toBe("Journal 2026-07-20");
  });

  it("extracts a plain-text excerpt", () => {
    expect(index.notes.get("hello-world")?.excerpt).toMatch(/^Welcome to the fixture vault/);
    expect(index.notes.get("media-note")?.excerpt).toBe("Media demo");
  });
});
