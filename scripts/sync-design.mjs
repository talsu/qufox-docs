#!/usr/bin/env node
/**
 * Maintainer script: refresh the vendored qufox design system snapshot.
 *
 *   pnpm sync:design            # pin the latest published version
 *   pnpm sync:design 0.5.0      # pin a specific version
 *
 * The engine serves these files itself, so sites keep working offline and
 * never break when design.qufox.com changes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = "https://design.qufox.com";
const FILES = ["tokens.css", "components.css", "icons.svg", "components.json"];
const destDir = fileURLToPath(new URL("../src/assets/design/", import.meta.url));

const manifest = await fetchJson(`${BASE}/versions.json`);
const requested = process.argv[2] ?? manifest.latest;
const entry = manifest.versions.find((v) => v.version === requested);
if (!entry) {
  console.error(
    `Version ${requested} not found. Published: ${manifest.versions.map((v) => v.version).join(", ")}`,
  );
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
for (const file of FILES) {
  const url = `${BASE}${entry.path}${file}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to download ${url}: ${response.status}`);
    process.exit(1);
  }
  await writeFile(`${destDir}${file}`, Buffer.from(await response.arrayBuffer()));
  console.log(`✓ ${file} (${entry.version})`);
}
await writeFile(`${destDir}VERSION`, `${entry.version}\n`);
console.log(`Pinned qufox-design v${entry.version}`);

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status}`);
    process.exit(1);
  }
  return response.json();
}
