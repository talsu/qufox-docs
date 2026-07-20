import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { Site } from "../../src/boot.js";
import { bootSite, buildSearchIndex } from "../../src/boot.js";
import { resolveConfig } from "../../src/config/load.js";
import { createApp } from "../../src/server/app.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

let site: Site;

beforeAll(async () => {
  const config = await resolveConfig({
    cwd: repoRoot,
    mode: "serve",
    contentDir: "fixtures/vault",
    env: {},
  });
  site = await bootSite(config);
  await buildSearchIndex(site);
}, 30_000);

describe("pagefind search index", () => {
  it("builds an index from the published posts", () => {
    if (!site.search.available) {
      console.warn("pagefind binary unavailable on this platform — skipping index assertions");
      return;
    }
    expect(site.search.getFile("pagefind.js")).toBeDefined();
    expect(site.search.getFile("pagefind-entry.json")).toBeDefined();
  });

  it("serves the pagefind bundle over HTTP", async () => {
    if (!site.search.available) return;
    const app = createApp({ ...site });
    const response = await app.request("/pagefind/pagefind.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
  });

  it("renders the search page with the command palette", async () => {
    const app = createApp({ ...site });
    const html = await (await app.request("/search")).text();
    expect(html).toContain("qf-cmd-palette");
    expect(html).toContain("data-search-autoopen");
  });

  it("returns 404 for unknown pagefind files", async () => {
    const app = createApp({ ...site });
    expect((await app.request("/pagefind/does-not-exist.pf_fragment")).status).toBe(404);
  });
});
