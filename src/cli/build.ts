import { statSync } from "node:fs";
import { defineCommand } from "citty";
import pc from "picocolors";
import { ConfigError, resolveConfig } from "../config/load.js";
import type { QufoxUserConfig } from "../config/schema.js";
import { exportSite, printBuildSummary } from "../export/build.js";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Export a content directory to a static site",
  },
  args: {
    dir: {
      type: "positional",
      description: "Content directory (default: current directory)",
      required: false,
    },
    out: { type: "string", description: "Output directory (default: dist)" },
    base: { type: "string", description: 'Base path for subpath hosting (e.g. "/blog/")' },
  },
  async run({ args }) {
    try {
      const overrides: QufoxUserConfig = {};
      if (args.out !== undefined || args.base !== undefined) {
        overrides.build = {};
        if (args.out !== undefined) overrides.build.outDir = args.out;
        if (args.base !== undefined) overrides.build.basePath = args.base;
      }

      const config = await resolveConfig({ mode: "build", contentDir: args.dir, overrides });
      assertDirectory(config.contentDirAbs);

      const result = await exportSite(config);
      printBuildSummary(result);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(pc.red(error.message));
        process.exit(1);
      }
      throw error;
    }
  },
});

function assertDirectory(path: string): void {
  try {
    if (statSync(path).isDirectory()) return;
  } catch {
    // fall through
  }
  throw new ConfigError(`Content directory not found: ${path}`);
}
