import { readFileSync } from "node:fs";

interface PackageJson {
  version: string;
}

// Works from both src/ (dev, vitest) and dist/ (published build): each sits
// one level below the package root.
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageJson;

export const ENGINE_VERSION: string = pkg.version;
