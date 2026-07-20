import { statSync } from "node:fs";
import { defineCommand } from "citty";
import open from "open";
import pc from "picocolors";
import { createServer } from "../boot.js";
import { ConfigError, resolveConfig } from "../config/load.js";
import type { QufoxUserConfig } from "../config/schema.js";

export const serveCommand = defineCommand({
  meta: {
    name: "serve",
    description: "Serve a content directory as a live website",
  },
  args: {
    dir: {
      type: "positional",
      description: "Content directory (default: current directory)",
      required: false,
    },
    port: { type: "string", description: "Port to listen on (default: 4880)" },
    host: { type: "string", description: "Host to bind (default: localhost)" },
    open: { type: "boolean", description: "Open the browser once the server starts" },
    "strict-port": { type: "boolean", description: "Fail instead of trying the next free port" },
    poll: {
      type: "boolean",
      description: "Poll for file changes (Docker bind mounts, network drives)",
    },
  },
  async run({ args }) {
    try {
      const config = await resolveConfig({
        mode: "serve",
        contentDir: args.dir,
        overrides: serverOverrides(args),
      });

      assertDirectory(config.contentDirAbs);

      const server = await createServer(config);
      for (const warning of server.index.warnings) {
        console.warn(pc.yellow(`  ! ${warning}`));
      }

      const running = await server.start();
      const { printServerBanner } = await import("../server/serve.js");
      printServerBanner(config, running);

      const localUrl = running.urls[0];
      if (config.server.open && localUrl !== undefined) {
        await open(localUrl);
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(pc.red(error.message));
        process.exit(1);
      }
      throw error;
    }
  },
});

function serverOverrides(args: {
  port?: string;
  host?: string;
  open?: boolean;
  "strict-port"?: boolean;
  poll?: boolean;
}): QufoxUserConfig {
  const server: NonNullable<QufoxUserConfig["server"]> = {};
  if (args.port !== undefined) {
    const port = Number.parseInt(args.port, 10);
    if (Number.isNaN(port)) throw new ConfigError(`--port must be an integer (got "${args.port}")`);
    server.port = port;
  }
  if (args.host !== undefined) server.host = args.host;
  if (args.open === true) server.open = true;
  if (args["strict-port"] === true) server.strictPort = true;
  if (args.poll === true) server.poll = true;
  return Object.keys(server).length > 0 ? { server } : {};
}

function assertDirectory(path: string): void {
  try {
    if (statSync(path).isDirectory()) return;
  } catch {
    // fall through
  }
  throw new ConfigError(`Content directory not found: ${path}`);
}
