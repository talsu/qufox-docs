import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { createServer, type QufoxServer } from "../../src/boot.js";
import { resolveConfig } from "../../src/config/load.js";
import type { QufoxUserConfig } from "../../src/config/schema.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

async function serveFixture(overrides?: QufoxUserConfig): Promise<QufoxServer> {
  const config = await resolveConfig({
    cwd: repoRoot,
    mode: "serve",
    contentDir: "fixtures/vault",
    env: {},
    overrides,
  });
  return createServer(config, { watch: false });
}

let site: QufoxServer;
let bare: QufoxServer;

beforeAll(async () => {
  site = await serveFixture({
    site: { url: "https://blog.example.com", favicon: "attachments/fox.png" },
    redirects: [
      { from: "/?feed=rss2", to: "/feed.xml" },
      { from: "/wp-content/uploads/*", to: "/assets/vault/attachments/*" },
      { from: "/guides/setup", to: "/hello-world" },
    ],
  });
  bare = await serveFixture();
});

describe("legacy redirects", () => {
  it("301s a note's query-string source before the home route answers", async () => {
    const response = await site.app.request("/?p=42");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/aliased");
  });

  it("301s a note's path source, with or without the trailing slash", async () => {
    for (const path of ["/2026/06/old-aliased", "/2026/06/old-aliased/"]) {
      const response = await site.app.request(path);
      expect(response.status, path).toBe(301);
      expect(response.headers.get("location")).toBe("/aliased");
    }
  });

  it("applies site-level rules, including subtree forwards", async () => {
    const feed = await site.app.request("/?feed=rss2");
    expect(feed.headers.get("location")).toBe("/feed.xml");
    const image = await site.app.request("/wp-content/uploads/fox.png");
    expect(image.status).toBe(301);
    expect(image.headers.get("location")).toBe("/assets/vault/attachments/fox.png");
  });

  it("never shadows a live page with a path redirect", async () => {
    const response = await site.app.request("/guides/setup");
    expect(response.status).toBe(200);
  });

  it("leaves unrelated query strings and unknown paths alone", async () => {
    expect((await site.app.request("/?utm_source=x")).status).toBe(200);
    expect((await site.app.request("/?p=41")).status).toBe(200);
    expect((await site.app.request("/nope")).status).toBe(404);
  });
});

describe("feed, sitemap, robots", () => {
  it("serves an RSS feed of published posts with absolute links", async () => {
    const response = await site.app.request("/feed.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/rss+xml");
    const xml = await response.text();
    expect(xml).toContain("<link>https://blog.example.com/hello-world</link>");
    expect(xml).toContain("<category>intro</category>");
    expect(xml).not.toContain("Draft Note");
    expect(xml).not.toContain("secret");
  });

  it("serves a sitemap listing the home page and every published post", async () => {
    const xml = await (await site.app.request("/sitemap.xml")).text();
    expect(xml).toContain("<loc>https://blog.example.com/</loc>");
    expect(xml).toContain(
      "<loc>https://blog.example.com/%ED%95%9C%EA%B8%80/%EC%86%8C%EA%B0%9C</loc>",
    );
    expect(xml).not.toContain("drafts-note");
  });

  it("points robots.txt at the sitemap", async () => {
    const text = await (await site.app.request("/robots.txt")).text();
    expect(text).toContain("Allow: /");
    expect(text).toContain("Sitemap: https://blog.example.com/sitemap.xml");
  });

  it("has no feed or sitemap without site.url, but still answers robots.txt", async () => {
    expect((await bare.app.request("/feed.xml")).status).toBe(404);
    expect((await bare.app.request("/sitemap.xml")).status).toBe(404);
    const robots = await bare.app.request("/robots.txt");
    expect(robots.status).toBe(200);
    expect(await robots.text()).not.toContain("Sitemap:");
  });
});

describe("head metadata", () => {
  it("marks posts as articles with a canonical URL and feed discovery", async () => {
    const html = await (await site.app.request("/hello-world")).text();
    expect(html).toContain('<link rel="canonical" href="https://blog.example.com/hello-world"/>');
    expect(html).toContain('<meta property="og:type" content="article"/>');
    expect(html).toContain('<meta property="og:title" content="Hello World"/>');
    expect(html).toContain('<meta property="article:published_time"');
    expect(html).toContain('type="application/rss+xml"');
    expect(html).toContain('<link rel="icon" href="/assets/vault/attachments/fox.png"/>');
  });

  it("omits absolute-URL tags without site.url and never canonicalizes the 404 page", async () => {
    const html = await (await bare.app.request("/hello-world")).text();
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("application/rss+xml");
    expect(html).toContain('<meta property="og:type" content="article"/>');
    const missing = await (await site.app.request("/nope")).text();
    expect(missing).not.toContain('rel="canonical"');
  });

  it("redirects /favicon.ico to the configured icon", async () => {
    const response = await site.app.request("/favicon.ico");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/assets/vault/attachments/fox.png");
    expect((await bare.app.request("/favicon.ico")).status).toBe(404);
  });
});

describe("feed entries and the side column", () => {
  it("renders each post as a story with its lead image and tags", async () => {
    const html = await (await site.app.request("/")).text();
    expect(html).toContain("qf-story qf-story--stretched qf-story--pictured");
    expect(html).toContain('class="qf-story__media" src="/assets/vault/attachments/fox.png"');
    expect(html).toContain('<a class="qf-source qf-source--link" href="/tags/intro">');
  });

  it("lists tags, years, and the feed beside the home feed", async () => {
    const html = await (await site.app.request("/")).text();
    expect(html).toContain("qf-twocol__aside qf-aside");
    expect(html).toContain('href="/archive#y2026"');
    expect(html).toContain('href="/feed.xml"');
    const archive = await (await site.app.request("/archive")).text();
    expect(archive).toContain('<h2 id="y2026">');
  });

  it("uses a post's lead image for link previews", async () => {
    const html = await (await site.app.request("/media-note")).text();
    expect(html).toContain(
      '<meta property="og:image" content="https://blog.example.com/assets/vault/attachments/fox.png"/>',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    const plain = await (await site.app.request("/hello-world")).text();
    expect(plain).not.toContain("og:image");
  });
});

describe("interface language", () => {
  it("follows site.locale and falls back to English", async () => {
    const korean = await serveFixture({ site: { locale: "ko-KR" } });
    const html = await (await korean.app.request("/")).text();
    expect(html).toContain('<html lang="ko-KR">');
    expect(html).toContain(">보관함</a>");
    expect(html).toContain("본문으로 건너뛰기");
    expect(await (await korean.app.request("/nope")).text()).toContain("찾는 페이지가 없습니다");

    const english = await (await bare.app.request("/")).text();
    expect(english).toContain(">Archive</a>");
    const other = await serveFixture({ site: { locale: "fr" } });
    expect(await (await other.app.request("/")).text()).toContain(">Archive</a>");
  });
});
