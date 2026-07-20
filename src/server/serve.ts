import { createServer as createNetServer } from "node:net";
import { networkInterfaces } from "node:os";
import { type ServerType, serve } from "@hono/node-server";
import type { Hono } from "hono";
import pc from "picocolors";
import type { ResolvedConfig } from "../config/schema.js";

export interface RunningServer {
  port: number;
  urls: string[];
  server: ServerType;
  close(): Promise<void>;
}

/** Start the HTTP server, auto-incrementing the port unless strictPort is set. */
export async function startServer(app: Hono, config: ResolvedConfig): Promise<RunningServer> {
  const { host, strictPort } = config.server;
  const port = await findAvailablePort(config.server.port, host, strictPort);

  const server = serve({ fetch: app.fetch, port, hostname: host });
  return {
    port,
    urls: siteUrls(host, port),
    server,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function printServerBanner(config: ResolvedConfig, running: RunningServer): void {
  const name = pc.magenta(pc.bold("qufox-docs"));
  console.log();
  console.log(`  ${name} ${pc.dim(`v${config.engineVersion}`)}  serving ${config.contentDirAbs}`);
  console.log();
  for (const [label, url] of running.urls.map((u, i) => [i === 0 ? "Local:  " : "Network:", u])) {
    console.log(`  ${pc.green("➜")}  ${label} ${pc.cyan(url ?? "")}`);
  }
  console.log();
}

async function findAvailablePort(
  preferred: number,
  host: string,
  strict: boolean,
): Promise<number> {
  for (let port = preferred; port < Math.min(preferred + 100, 65536); port++) {
    if (await isPortFree(port, host)) {
      return port;
    }
    if (strict) {
      throw new Error(`Port ${preferred} is already in use (server.strictPort is enabled).`);
    }
  }
  throw new Error(`No free port found near ${preferred}.`);
}

function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createNetServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

function siteUrls(host: string, port: number): string[] {
  if (host === "localhost" || host === "127.0.0.1") {
    return [`http://localhost:${port}/`];
  }
  const urls = [`http://localhost:${port}/`];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}/`);
      }
    }
  }
  return urls;
}
