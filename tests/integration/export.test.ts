import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/config/load.js";
import type { QufoxUserConfig } from "../../src/config/schema.js";
import { type BuildResult, exportSite } from "../../src/export/build.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const dirs: string[] = [];

async function build(overrides: QufoxUserConfig): Promise<{ outDir: string; result: BuildResult }> {
  const outDir = realpathSync(mkdtempSync(join(tmpdir(), "qufox-build-")));
  dirs.push(outDir);
  const config = await resolveConfig({
    cwd: repoRoot,
    mode: "build",
    contentDir: "fixtures/vault",
    overrides: { ...overrides, build: { ...overrides.build, outDir } },
    env: {},
  });
  const result = await exportSite(config);
  return { outDir, result };
}

afterAll(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("static export", () => {
  let outDir: string;
  let result: BuildResult;

  beforeAll(async () => {
    ({ outDir, result } = await build({}));
  }, 30_000);

  it("writes the full route tree", () => {
    for (const file of [
      "index.html",
      "guides/setup/index.html",
      "tags/index.html",
      "tags/intro/index.html",
      "archive/index.html",
      "search/index.html",
      "404.html",
    ]) {
      expect(existsSync(join(outDir, file)), file).toBe(true);
    }
  });

  it("writes unicode slugs as real directories", () => {
    expect(existsSync(join(outDir, "한글", "소개", "index.html"))).toBe(true);
  });

  it("copies referenced attachments and the design system", () => {
    expect(existsSync(join(outDir, "assets/vault/attachments/fox.png"))).toBe(true);
    expect(existsSync(join(outDir, "assets/design/tokens.css"))).toBe(true);
    expect(existsSync(join(outDir, "assets/app/theme.js"))).toBe(true);
  });

  it("never references the live-reload script", () => {
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).not.toContain("livereload.js");
  });

  it("does not publish drafts or hidden notes", () => {
    expect(existsSync(join(outDir, "drafts-note/index.html"))).toBe(false);
    expect(existsSync(join(outDir, "_private/secret/index.html"))).toBe(false);
  });

  it("reports pages, attachments, and the missing site.url warning", () => {
    expect(result.pages).toBeGreaterThan(5);
    expect(result.attachments).toBe(1);
    expect(result.warnings.some((w) => w.includes("site.url"))).toBe(true);
  });
});

describe("static export with a base path", () => {
  it("prefixes every internal link and asset with the base path", async () => {
    const { outDir } = await build({ build: { basePath: "/blog/" } });
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain('content="/blog/"');
    expect(html).toContain('href="/blog/assets/design/tokens.css');
    expect(html).toContain('href="/blog/archive"');
    expect(html).not.toMatch(/href="\/(guides|tags|archive)\//);
  });
});
