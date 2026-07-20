import { describe, expect, it } from "vitest";
import { normalizeRelPath, relPathKey, slugForNote } from "../../src/content/slugs.js";

describe("slugForNote", () => {
  it("maps the file path as-is without extension", () => {
    expect(slugForNote("guides/setup.md", {})).toBe("guides/setup");
    expect(slugForNote("hello.md", {})).toBe("hello");
  });

  it("folds index.md onto its folder", () => {
    expect(slugForNote("guides/index.md", {})).toBe("guides");
    expect(slugForNote("a/b/index.md", {})).toBe("a/b");
    expect(slugForNote("index.md", {})).toBe("");
  });

  it("keeps unicode paths, normalized to NFC", () => {
    const decomposed = "한글/소개.md".normalize("NFD");
    expect(slugForNote(decomposed, {})).toBe("한글/소개");
  });

  it("lets frontmatter slug override the filename segment", () => {
    expect(slugForNote("guides/setup.md", { slug: "getting-started" })).toBe(
      "guides/getting-started",
    );
  });

  it("lets frontmatter permalink override the whole path", () => {
    expect(slugForNote("deep/nested/note.md", { permalink: "/flat/" })).toBe("flat");
    expect(slugForNote("note.md", { permalink: "docs/intro" })).toBe("docs/intro");
  });

  it("converts windows separators", () => {
    expect(slugForNote(normalizeRelPath("guides\\setup.md"), {})).toBe("guides/setup");
  });
});

describe("relPathKey", () => {
  it("lowercases and strips the markdown extension", () => {
    expect(relPathKey("Guides/Setup.MD")).toBe("guides/setup");
  });
});
