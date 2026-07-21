import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigError, resolveConfig } from "../../src/config/load.js";

const dirs: string[] = [];

function tmpProject(files: Record<string, string> = {}): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "qufox-config-")));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveConfig", () => {
  it("applies defaults with zero config", async () => {
    const dir = tmpProject();
    const config = await resolveConfig({ cwd: dir, mode: "serve", env: {} });

    expect(config.server.port).toBe(4880);
    expect(config.server.host).toBe("localhost");
    expect(config.publish.mode).toBe("opt-out");
    expect(config.theme.default).toBe("light");
    expect(config.theme.brand).toBe("qufox");
    expect(config.feed.pageSize).toBe(10);
    expect(config.build.basePath).toBe("/");
    expect(config.markdown.breaks).toBe(true);
    expect(config.contentDirAbs).toBe(dir);
    expect(config.site.title).toBe(basename(dir));
    expect(config.configFile).toBeUndefined();
    expect(config.mode).toBe("serve");
  });

  it("reads qufox.config.json from the working directory", async () => {
    const dir = tmpProject({
      "qufox.config.json": JSON.stringify({
        site: { title: "My Notes" },
        server: { port: 5000 },
      }),
    });
    const config = await resolveConfig({ cwd: dir, mode: "serve", env: {} });

    expect(config.site.title).toBe("My Notes");
    expect(config.server.port).toBe(5000);
    expect(config.configFile).toBeDefined();
  });

  it("lets QUFOX_* environment variables override the config file", async () => {
    const dir = tmpProject({
      "qufox.config.json": JSON.stringify({ server: { port: 5000, host: "0.0.0.0" } }),
    });
    const config = await resolveConfig({
      cwd: dir,
      mode: "serve",
      env: { QUFOX_PORT: "6000", QUFOX_POLL: "true" },
    });

    expect(config.server.port).toBe(6000);
    expect(config.server.poll).toBe(true);
    expect(config.server.host).toBe("0.0.0.0");
  });

  it("lets CLI overrides beat environment variables", async () => {
    const dir = tmpProject();
    const config = await resolveConfig({
      cwd: dir,
      mode: "serve",
      env: { QUFOX_PORT: "6000" },
      overrides: { server: { port: 7000 } },
    });

    expect(config.server.port).toBe(7000);
  });

  it("lets the CLI positional contentDir beat the environment", async () => {
    const dir = tmpProject();
    const config = await resolveConfig({
      cwd: dir,
      mode: "serve",
      env: { QUFOX_CONTENT_DIR: "from-env" },
      contentDir: "from-cli",
    });

    expect(config.contentDirAbs).toBe(join(dir, "from-cli"));
  });

  it("rejects invalid config values with a ConfigError", async () => {
    const dir = tmpProject({
      "qufox.config.json": JSON.stringify({ server: { port: "abc" } }),
    });

    await expect(resolveConfig({ cwd: dir, mode: "serve", env: {} })).rejects.toThrow(ConfigError);
  });

  it("rejects a basePath without surrounding slashes", async () => {
    const dir = tmpProject({
      "qufox.config.json": JSON.stringify({ build: { basePath: "blog" } }),
    });

    await expect(resolveConfig({ cwd: dir, mode: "build", env: {} })).rejects.toThrow(
      /basePath must start and end/,
    );
  });

  it("rejects malformed QUFOX_PORT values", async () => {
    const dir = tmpProject();

    await expect(
      resolveConfig({ cwd: dir, mode: "serve", env: { QUFOX_PORT: "not-a-port" } }),
    ).rejects.toThrow(ConfigError);
  });
});
