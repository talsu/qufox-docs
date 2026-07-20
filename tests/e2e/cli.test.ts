import { type ChildProcess, execSync, spawn } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const cli = join(repoRoot, "dist", "cli.js");
const fixtureVault = join(repoRoot, "fixtures", "vault");
const cleanups: Array<() => void> = [];

beforeAll(() => {
  if (!existsSync(cli)) {
    execSync("pnpm build", { cwd: repoRoot, stdio: "ignore" });
  }
}, 120_000);

afterAll(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function tempVault(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "qufox-e2e-")));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(fixtureVault, dir, { recursive: true });
  return dir;
}

interface Server {
  proc: ChildProcess;
  url: string;
  stop(): void;
}

/** Spawn the real CLI, wait for the banner URL, and return it. */
function spawnServe(dir: string, args: string[] = []): Promise<Server> {
  const proc = spawn("node", [cli, "serve", dir, "--poll", ...args], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  cleanups.push(() => proc.kill("SIGKILL"));

  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 20_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/localhost:(\d+)\//);
      if (match !== null) {
        clearTimeout(timer);
        proc.stdout?.off("data", onData);
        resolve({
          proc,
          url: `http://localhost:${match[1]}`,
          stop: () => proc.kill("SIGKILL"),
        });
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.once("error", reject);
  });
}

describe("qufox-docs serve (real process)", { timeout: 30_000, retry: 1 }, () => {
  it("serves rendered pages and live-reloads on file changes", async () => {
    const dir = tempVault();
    const server = await spawnServe(dir);

    const home = await fetch(`${server.url}/`);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("qf-app-shell");

    const post = await fetch(`${server.url}/guides/setup`);
    expect(post.status).toBe(200);
    expect(await post.text()).toContain("qf-prose");

    // Open the SSE stream, then touch a watched file and expect an event.
    const controller = new AbortController();
    const events = fetch(`${server.url}/__qufox/events`, {
      signal: controller.signal,
      headers: { accept: "text/event-stream" },
    });

    const received = (async () => {
      const response = await events;
      const reader = response.body?.getReader();
      if (reader === undefined) return "";
      const decoder = new TextDecoder();
      let buffer = "";
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.includes("event: change") || buffer.includes("event: reload")) return buffer;
      }
      return buffer;
    })();

    await new Promise((r) => setTimeout(r, 500));
    appendFileSync(join(dir, "guides", "setup.md"), "\n\nAppended by the e2e test.\n");

    const buffer = await received;
    controller.abort();
    expect(buffer).toMatch(/event: (change|reload)/);

    server.stop();
  });
});

describe("qufox-docs build (real process)", { timeout: 60_000, retry: 1 }, () => {
  it("exports a static site and exits cleanly", () => {
    const dir = tempVault();
    const out = realpathSync(mkdtempSync(join(tmpdir(), "qufox-e2e-out-")));
    cleanups.push(() => rmSync(out, { recursive: true, force: true }));

    const stdout = execSync(`node "${cli}" build "${dir}" --out "${out}"`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(stdout).toContain("built");

    expect(existsSync(join(out, "index.html"))).toBe(true);
    expect(existsSync(join(out, "404.html"))).toBe(true);
    expect(existsSync(join(out, "guides", "setup", "index.html"))).toBe(true);
    expect(readFileSync(join(out, "index.html"), "utf8")).not.toContain("livereload.js");
  });
});
