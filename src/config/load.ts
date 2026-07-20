import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { loadConfig } from "c12";
import { defu } from "defu";
import { z } from "zod";
import { ENGINE_VERSION } from "../version.js";
import { configSchema, type QufoxUserConfig, type ResolvedConfig } from "./schema.js";

/** Raised for invalid configuration; the CLI prints its message without a stack trace. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

export interface ResolveConfigOptions {
  mode: "serve" | "build";
  cwd?: string;
  /** Content directory from the CLI positional argument (highest precedence). */
  contentDir?: string;
  /** Structured overrides from CLI flags (highest precedence). */
  overrides?: QufoxUserConfig;
  /** Environment source, injectable for tests. Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Load and validate configuration with the precedence
 * CLI flags > `QUFOX_*` environment variables > config file > defaults.
 */
export async function resolveConfig(options: ResolveConfigOptions): Promise<ResolvedConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const fromCli = defu(
    options.contentDir !== undefined ? { contentDir: options.contentDir } : {},
    options.overrides ?? {},
  );
  const fromEnv = readEnvConfig(options.env ?? process.env);

  const { config, configFile } = await loadConfig<QufoxUserConfig>({
    name: "qufox",
    cwd,
    packageJson: true,
    overrides: defu(fromCli, fromEnv) as QufoxUserConfig,
  });

  const parsed = configSchema.safeParse(config ?? {});
  if (!parsed.success) {
    throw new ConfigError(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }

  const resolvedConfig = parsed.data;
  const contentDirAbs = resolve(cwd, resolvedConfig.contentDir);
  return {
    ...resolvedConfig,
    site: {
      ...resolvedConfig.site,
      title: resolvedConfig.site.title ?? basename(contentDirAbs),
    },
    contentDirAbs,
    mode: options.mode,
    configFile:
      typeof configFile === "string" && existsSync(configFile) ? resolve(configFile) : undefined,
    engineVersion: ENGINE_VERSION,
  };
}

/** Map `QUFOX_*` environment variables onto the user-config shape. */
export function readEnvConfig(env: NodeJS.ProcessEnv): QufoxUserConfig {
  const config: QufoxUserConfig = {};

  const contentDir = readString(env, "QUFOX_CONTENT_DIR");
  if (contentDir !== undefined) config.contentDir = contentDir;

  const siteUrl = readString(env, "QUFOX_SITE_URL");
  if (siteUrl !== undefined) config.site = { url: siteUrl };

  const publishMode = readString(env, "QUFOX_PUBLISH_MODE");
  if (publishMode !== undefined) {
    config.publish = { mode: publishMode as "opt-out" | "opt-in" };
  }

  const server: NonNullable<QufoxUserConfig["server"]> = {};
  const port = readInteger(env, "QUFOX_PORT");
  if (port !== undefined) server.port = port;
  const host = readString(env, "QUFOX_HOST");
  if (host !== undefined) server.host = host;
  const poll = readBoolean(env, "QUFOX_POLL");
  if (poll !== undefined) server.poll = poll;
  if (Object.keys(server).length > 0) config.server = server;

  const basePath = readString(env, "QUFOX_BASE_PATH");
  if (basePath !== undefined) config.build = { basePath };

  return config;
}

function readString(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  return value === undefined || value === "" ? undefined : value;
}

function readInteger(env: NodeJS.ProcessEnv, key: string): number | undefined {
  const value = readString(env, key);
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new ConfigError(`${key} must be an integer (got "${value}")`);
  }
  return parsed;
}

function readBoolean(env: NodeJS.ProcessEnv, key: string): boolean | undefined {
  const value = readString(env, key);
  if (value === undefined) return undefined;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new ConfigError(`${key} must be a boolean (got "${value}")`);
}
