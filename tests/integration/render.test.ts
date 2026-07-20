import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { createServer, type QufoxServer } from "../../src/boot.js";
import { resolveConfig } from "../../src/config/load.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

let site: QufoxServer;

beforeAll(async () => {
  const config = await resolveConfig({
    cwd: repoRoot,
    mode: "serve",
    contentDir: "fixtures/vault",
    env: {},
  });
  site = await createServer(config, { watch: false });
});

describe("home page", () => {
  it("serves the blog feed with qf components", async () => {
    const response = await site.app.request("/");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="qf-app-shell"');
    expect(html).toContain('class="qf-navbar"');
    expect(html).toContain("qf-card qf-card--interactive");
    expect(html).toContain("Hello World");
    expect(html).not.toContain("Draft Note");
  });

  it("stamps generator and design-system versions", async () => {
    const html = await (await site.app.request("/")).text();
    expect(html).toMatch(/<meta name="generator" content="qufox-docs \d/);
    expect(html).toMatch(/<meta name="qufox-design-version" content="\d+\.\d+\.\d+"/);
  });
});

describe("post pages", () => {
  it("renders a note inside qf-prose with highlighted code", async () => {
    const response = await site.app.request("/guides/setup");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("qf-prose");
    expect(html).toContain("shiki");
    expect(html).toContain("<title>Setup · vault</title>");
  });

  it("does not repeat the title as a body h1", async () => {
    const html = await (await site.app.request("/guides/setup")).text();
    const h1Count = html.match(/<h1/g)?.length ?? 0;
    expect(h1Count).toBe(1);
  });

  it("serves unicode slugs", async () => {
    const response = await site.app.request(
      `/${encodeURIComponent("한글")}/${encodeURIComponent("소개")}`,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("소개");
  });

  it("returns 304 when the etag matches", async () => {
    const first = await site.app.request("/guides/setup");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const second = await site.app.request("/guides/setup", {
      headers: { "if-none-match": etag ?? "" },
    });
    expect(second.status).toBe(304);
  });

  it("hides drafts and hidden folders", async () => {
    expect((await site.app.request("/drafts-note")).status).toBe(404);
    expect((await site.app.request("/_private/secret")).status).toBe(404);
  });

  it("renders a styled 404 page", async () => {
    const response = await site.app.request("/no/such/page");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("qf-empty");
  });
});

describe("asset routes", () => {
  it("serves the vendored design system", async () => {
    const response = await site.app.request("/assets/design/tokens.css");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  it("serves the engine stylesheet", async () => {
    const response = await site.app.request("/assets/app/engine.css");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("shiki");
  });

  it("serves vault attachments but never markdown sources", async () => {
    const image = await site.app.request("/assets/vault/attachments/fox.png");
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");

    expect((await site.app.request("/assets/vault/hello-world.md")).status).toBe(404);
    expect((await site.app.request("/assets/vault/_private/secret.md")).status).toBe(404);
    expect((await site.app.request("/assets/vault/../package.json")).status).toBe(404);
  });
});
