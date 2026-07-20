import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSETS_DIR, DS_VERSION } from "../../src/assets-dir.js";

describe("vendored design system", () => {
  it.each(["tokens.css", "components.css", "icons.svg", "components.json"])("ships %s", (file) => {
    expect(statSync(join(ASSETS_DIR, "design", file)).size).toBeGreaterThan(1000);
  });

  it("pins a semver design-system version", () => {
    expect(DS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("vendored tokens.css matches the pinned version banner", () => {
    const tokens = readFileSync(join(ASSETS_DIR, "design", "tokens.css"), "utf8");
    expect(tokens).toContain(`qufox-design v${DS_VERSION}`);
  });

  it("keeps the dark-first theme contract the engine relies on", () => {
    const tokens = readFileSync(join(ASSETS_DIR, "design", "tokens.css"), "utf8");
    expect(tokens).toContain(":root");
    expect(tokens).toContain('[data-theme="light"]');
  });
});
