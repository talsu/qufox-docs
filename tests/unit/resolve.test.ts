import { describe, expect, it } from "vitest";
import { resolveAttachment, resolveLinkTarget } from "../../src/content/resolve.js";
import type { ScanResult } from "../../src/content/scan.js";
import { buildSiteIndex } from "../../src/content/site-index.js";
import type { SiteIndex } from "../../src/types.js";

function makeIndex(files: Record<string, string>, attachments: string[] = []): SiteIndex {
  const scan: ScanResult = {
    markdown: Object.entries(files).map(([relPath, raw]) => ({
      absPath: `/vault/${relPath}`,
      relPath,
      raw,
      mtimeMs: 1_700_000_000_000,
    })),
    attachments: attachments.map((relPath) => ({ absPath: `/vault/${relPath}`, relPath })),
  };
  return buildSiteIndex(scan, { publish: { mode: "opt-out", exclude: [] } });
}

describe("resolveLinkTarget", () => {
  const index = makeIndex({
    "hello.md": "Hello",
    "guides/setup.md": "# Setup",
    "guides/other/setup.md": "# Other Setup",
    "guides/advanced/deep.md": "Deep",
    "aliased.md": "---\naliases: [nickname]\n---\nAliased",
    "한글/소개.md": "# 소개",
  });

  it("resolves vault-absolute paths", () => {
    expect(resolveLinkTarget(index, "hello.md", "guides/setup")).toEqual({
      kind: "note",
      slug: "guides/setup",
      fragment: null,
    });
  });

  it("resolves relative to the linking note", () => {
    expect(resolveLinkTarget(index, "guides/advanced/deep.md", "../setup")).toMatchObject({
      kind: "note",
      slug: "guides/setup",
    });
  });

  it("resolves unique basenames from anywhere", () => {
    expect(resolveLinkTarget(index, "guides/setup.md", "hello")).toMatchObject({
      kind: "note",
      slug: "hello",
    });
  });

  it("prefers the shortest path for ambiguous basenames", () => {
    expect(resolveLinkTarget(index, "hello.md", "setup")).toMatchObject({
      kind: "note",
      slug: "guides/setup",
    });
  });

  it("narrows ambiguity with a path-qualified suffix", () => {
    expect(resolveLinkTarget(index, "hello.md", "other/setup")).toMatchObject({
      kind: "note",
      slug: "guides/other/setup",
    });
  });

  it("is case-insensitive and extension-tolerant", () => {
    expect(resolveLinkTarget(index, "hello.md", "Guides/Setup.md")).toMatchObject({
      kind: "note",
      slug: "guides/setup",
    });
  });

  it("resolves unicode targets in any normalization form", () => {
    expect(resolveLinkTarget(index, "hello.md", "소개".normalize("NFD"))).toMatchObject({
      kind: "note",
      slug: "한글/소개",
    });
  });

  it("resolves aliases", () => {
    expect(resolveLinkTarget(index, "hello.md", "nickname")).toMatchObject({
      kind: "note",
      slug: "aliased",
    });
  });

  it("carries fragments through", () => {
    expect(resolveLinkTarget(index, "hello.md", "guides/setup#Install")).toEqual({
      kind: "note",
      slug: "guides/setup",
      fragment: "Install",
    });
  });

  it("returns same-page anchors for bare fragments", () => {
    expect(resolveLinkTarget(index, "hello.md", "#Install")).toEqual({
      kind: "anchor",
      fragment: "Install",
    });
  });

  it("reports unknown targets as unresolved", () => {
    expect(resolveLinkTarget(index, "hello.md", "missing-note")).toEqual({
      kind: "unresolved",
      raw: "missing-note",
    });
  });
});

describe("resolveAttachment", () => {
  const index = makeIndex({ "note.md": "hi" }, ["attachments/fox.png", "guides/media/fox.png"]);

  it("resolves by bare basename to the shortest path", () => {
    expect(resolveAttachment(index, "fox.png")?.relPath).toBe("attachments/fox.png");
  });

  it("resolves path-qualified references", () => {
    expect(resolveAttachment(index, "media/fox.png")?.relPath).toBe("guides/media/fox.png");
  });

  it("returns null for unknown files", () => {
    expect(resolveAttachment(index, "missing.png")).toBeNull();
  });
});
