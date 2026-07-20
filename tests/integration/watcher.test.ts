import { cpSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/config/load.js";
import { scanVault } from "../../src/content/scan.js";
import { applyVaultChanges, buildSiteIndex } from "../../src/content/site-index.js";
import { type ChangeBatch, createVaultWatcher } from "../../src/content/watcher.js";

const fixtureVault = fileURLToPath(new URL("../../fixtures/vault", import.meta.url));

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function setup() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "qufox-watch-")));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(fixtureVault, dir, { recursive: true });

  const config = await resolveConfig({ cwd: dir, mode: "serve", env: {} });
  const index = buildSiteIndex(await scanVault(dir), config);

  const batches: ChangeBatch[] = [];
  const watcher = createVaultWatcher(config, (batch) => {
    batches.push(batch);
  });
  cleanups.push(() => watcher.close());
  await new Promise<void>((resolve) => watcher.once("ready", () => resolve()));

  const nextBatch = async (): Promise<ChangeBatch> => {
    const initial = batches.length;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (batches.length > initial) return batches[batches.length - 1] as ChangeBatch;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error("watcher batch did not arrive in time");
  };

  return { dir, config, index, nextBatch };
}

describe("vault watcher + incremental index", { retry: 2, timeout: 20_000 }, () => {
  it("indexes newly added notes", async () => {
    const { dir, config, index, nextBatch } = await setup();

    writeFileSync(
      join(dir, "fresh-note.md"),
      "---\ntitle: Fresh\ndate: 2026-07-21\n---\n\nBrand new.\n",
    );
    const batch = await nextBatch();
    expect(batch.paths.get("fresh-note.md")).toBe("add");

    const before = index.revision;
    const applied = await applyVaultChanges(index, config, batch);
    expect(applied.structural).toBe(true);
    expect(index.notes.get("fresh-note")?.title).toBe("Fresh");
    expect(index.posts[0]).toBe("fresh-note");
    expect(index.revision).toBe(before + 1);
  });

  it("applies edits and reports affected pages", async () => {
    const { dir, config, index, nextBatch } = await setup();

    await writeFile(
      join(dir, "hello-world.md"),
      "---\ntitle: Hello World\ndate: 2026-07-01\ntags: [intro, blog]\n---\n\nEdited body text.\n",
    );
    const batch = await nextBatch();
    const applied = await applyVaultChanges(index, config, batch);

    expect([...applied.changedSlugs]).toEqual(["hello-world"]);
    expect(index.notes.get("hello-world")?.excerpt).toContain("Edited body");
  });

  it("removes deleted notes and updates derived maps", async () => {
    const { dir, config, index, nextBatch } = await setup();
    expect(index.tags.has("한글태그")).toBe(true);

    await rm(join(dir, "한글", "소개.md"));
    const batch = await nextBatch();
    const applied = await applyVaultChanges(index, config, batch);

    expect(applied.structural).toBe(true);
    expect(index.notes.has("한글/소개")).toBe(false);
    expect(index.tags.has("한글태그")).toBe(false);
    expect(index.posts).not.toContain("한글/소개");
  });
});
