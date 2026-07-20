import { z } from "zod";

export const configSchema = z.object({
  /** Directory containing the markdown content. Relative paths resolve from cwd. */
  contentDir: z.string().default("."),
  site: z
    .object({
      /** Site title. Defaults to the content directory name. */
      title: z.string().optional(),
      description: z.string().default(""),
      /** BCP 47 language tag used for the `<html lang>` attribute. */
      locale: z.string().default("en"),
      /** Public origin of the deployed site, e.g. "https://blog.example.com". */
      url: z.url().optional(),
    })
    .prefault({}),
  publish: z
    .object({
      /**
       * "opt-out": every note is public unless excluded (`draft: true`,
       * `_`-prefixed paths, or `exclude` globs).
       * "opt-in": only notes with `publish: true` frontmatter are public.
       */
      mode: z.enum(["opt-out", "opt-in"]).default("opt-out"),
      /** Glob patterns (relative to contentDir) that are never published. */
      exclude: z.array(z.string()).default([]),
    })
    .prefault({}),
  server: z
    .object({
      port: z.number().int().min(1).max(65535).default(4880),
      /** Fail instead of auto-incrementing when the port is taken. */
      strictPort: z.boolean().default(false),
      host: z.string().default("localhost"),
      /** Open the browser after the server starts. */
      open: z.boolean().default(false),
      /** Poll for file changes (Docker bind mounts, network drives). */
      poll: z.boolean().default(false),
      /**
       * Push live-reload events to browsers (auto-refresh on content change).
       * Disable for production serving so visitors are not refreshed mid-read;
       * the server still re-renders changed content on the next request.
       */
      liveReload: z.boolean().default(true),
    })
    .prefault({}),
  theme: z
    .object({
      default: z.enum(["dark", "light", "system"]).default("dark"),
    })
    .prefault({}),
  feed: z
    .object({
      /** Posts per page on list pages. */
      pageSize: z.number().int().min(1).max(100).default(10),
    })
    .prefault({}),
  build: z
    .object({
      outDir: z.string().default("dist"),
      /** URL prefix for subpath hosting. Must start and end with "/". */
      basePath: z
        .string()
        .regex(/^\/(?:[^\s]*\/)?$/, 'basePath must start and end with "/" (e.g. "/blog/")')
        .default("/"),
    })
    .prefault({}),
  markdown: z
    .object({
      /** Render single newlines as line breaks (Obsidian's default behavior). */
      breaks: z.boolean().default(true),
    })
    .prefault({}),
});

/** Shape accepted from config files, CLI flags, and environment variables. */
export type QufoxUserConfig = z.input<typeof configSchema>;

/** Fully defaulted configuration. */
export type QufoxConfig = z.output<typeof configSchema>;

/** Configuration after path resolution and runtime context are applied. */
export type ResolvedConfig = Omit<QufoxConfig, "site"> & {
  site: Omit<QufoxConfig["site"], "title"> & { title: string };
  /** Absolute path of the content directory. */
  contentDirAbs: string;
  mode: "serve" | "build";
  /** Absolute path of the loaded config file, if one was found. */
  configFile: string | undefined;
  engineVersion: string;
};

/** Type helper for authoring `qufox.config.ts`. */
export function defineConfig(config: QufoxUserConfig): QufoxUserConfig {
  return config;
}
