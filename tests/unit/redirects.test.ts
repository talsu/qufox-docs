import { describe, expect, it } from "vitest";
import { buildRedirectTable, matchRedirect } from "../../src/site/redirects.js";
import { createHref } from "../../src/site/url.js";
import { indexFromFiles } from "../helpers/markdown.js";

const href = createHref("/");

function table(
  files: Record<string, string>,
  redirects: Array<{ from: string; to: string }> = [],
  warnings: string[] = [],
) {
  return buildRedirectTable(indexFromFiles(files), { redirects }, href, (message) =>
    warnings.push(message),
  );
}

const note = (redirectFrom: string, extra = "") =>
  `---\ntitle: T\nredirect_from: ${redirectFrom}\n${extra}---\n\nBody.`;

describe("note redirects (redirect_from)", () => {
  it("matches a query-string source on the home path", () => {
    const t = table({ "posts/한글 글.md": note('["/?p=2117"]') });
    expect(matchRedirect(t, "/", "?p=2117")).toBe("/posts/%ED%95%9C%EA%B8%80%20%EA%B8%80");
    expect(matchRedirect(t, "/", "?p=2117&utm_source=x")).not.toBeNull();
    expect(matchRedirect(t, "/", "?p=21")).toBeNull();
    expect(matchRedirect(t, "/", "")).toBeNull();
    expect(matchRedirect(t, "/other", "?p=2117")).toBeNull();
  });

  it("matches a path source regardless of trailing slash and encoding", () => {
    const t = table({ "a.md": note('"/2011/11/옛 글/"') });
    expect(matchRedirect(t, "/2011/11/%EC%98%9B%20%EA%B8%80", "")).toBe("/a");
    expect(matchRedirect(t, "/2011/11/%EC%98%9B%20%EA%B8%80/", "")).toBe("/a");
  });

  it("leaves path sources to the not-found fallback when asked for query rules only", () => {
    const t = table({ "a.md": note('["/old", "/?p=1"]') });
    expect(matchRedirect(t, "/old", "?x=1", { queryOnly: true })).toBeNull();
    expect(matchRedirect(t, "/", "?p=1", { queryOnly: true })).toBe("/a");
  });

  it("ignores unpublished notes and sources that are not root paths", () => {
    const warnings: string[] = [];
    const t = table(
      { "draft.md": note('"/old-draft"', "draft: true\n"), "b.md": note('"old-b"') },
      [],
      warnings,
    );
    expect(matchRedirect(t, "/old-draft", "")).toBeNull();
    expect(matchRedirect(t, "/old-b", "")).toBeNull();
    expect(warnings.some((w) => w.includes("old-b"))).toBe(true);
  });

  it("keeps the first claim on a source and warns about the second", () => {
    const warnings: string[] = [];
    const t = table({ "a.md": note('"/old"'), "b.md": note('"/old"') }, [], warnings);
    expect(matchRedirect(t, "/old", "")).toBe("/a");
    expect(warnings).toHaveLength(1);
  });
});

describe("site redirects (config)", () => {
  it("prefers the rule with more query parameters", () => {
    const t = table({}, [
      { from: "/?feed=rss2", to: "/feed.xml" },
      { from: "/?feed=rss2&cat=3", to: "/tags/news" },
    ]);
    expect(matchRedirect(t, "/", "?cat=3&feed=rss2")).toBe("/tags/news");
    expect(matchRedirect(t, "/", "?feed=rss2")).toBe("/feed.xml");
  });

  it("forwards a subtree with a trailing splat", () => {
    const t = table({}, [{ from: "/wp-content/uploads/*", to: "/assets/vault/assets/uploads/*" }]);
    expect(matchRedirect(t, "/wp-content/uploads/2011/10/a%20b.png", "")).toBe(
      "/assets/vault/assets/uploads/2011/10/a%20b.png",
    );
    expect(matchRedirect(t, "/wp-content/other.png", "")).toBeNull();
  });

  it("encodes a plain path target and leaves external targets verbatim", () => {
    const t = table({}, [
      { from: "/?cat=6", to: "/tags/photos/나의 일상" },
      { from: "/elsewhere", to: "https://example.com/a?b=1" },
    ]);
    expect(matchRedirect(t, "/", "?cat=6")).toBe(
      "/tags/photos/%EB%82%98%EC%9D%98%20%EC%9D%BC%EC%83%81",
    );
    expect(matchRedirect(t, "/elsewhere", "")).toBe("https://example.com/a?b=1");
  });

  it("wins over a note claiming the same source", () => {
    const t = table({ "a.md": note('"/old"') }, [{ from: "/old", to: "/b" }]);
    expect(matchRedirect(t, "/old", "")).toBe("/b");
  });
});
