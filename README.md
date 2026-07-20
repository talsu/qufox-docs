# qufox-docs

Serve a folder of Obsidian-flavored Markdown as a modern blog — live.

[![CI](https://github.com/talsu/qufox-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/talsu/qufox-docs/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

Point qufox-docs at any directory of Markdown files — an Obsidian vault, a notes
folder, a docs tree — and it becomes a website on the spot. Edits show up in the
browser as you save, with no build step in your writing loop. The same content
exports to a fully static site when you want to deploy.

> **Status:** early development. Not yet published to npm.

## Quick start

```sh
npx qufox-docs serve ./notes
```

Open the printed URL, edit a Markdown file in your editor, and watch the page
update. To publish a static build:

```sh
npx qufox-docs build ./notes --out ./dist
```

## Why

- **Live by default** — the filesystem is watched, pages render on request, and
  the browser reloads on save. Write in Obsidian (or anything), see it on the web.
- **Obsidian-friendly** — wikilinks, embeds, callouts, tags, and highlights render
  the way you wrote them.
- **One design system** — every page is built from the
  [qufox design system](https://design.qufox.com): plain CSS, `qf-*` classes,
  dark-first with a light theme.
- **An engine, not a template** — install it, point it at your content, done.
  Your content never lives in this repository.

## Commands

| Command | What it does |
| --- | --- |
| `qufox-docs serve [dir]` | Serve `dir` (default: current directory) as a live site. |
| `qufox-docs build [dir]` | Export `dir` to a static site under `--out` (default: `dist`). |

Useful flags: `--port`, `--host`, `--open`, `--strict-port`, `--poll` (serve);
`--out`, `--base` (build). Running under WSL, Docker, or a network drive? Add
`--poll` so file changes are detected reliably.

## Configuration

Zero-config by default. To customize, add `qufox.config.ts` (or `.js` / `.json`)
next to your content, or a `qufox` key in `package.json`:

```ts
import { defineConfig } from "qufox-docs";

export default defineConfig({
  site: { title: "My Notes", description: "Thinking out loud", locale: "en" },
  publish: { mode: "opt-out" },     // or "opt-in": only publish: true notes
  feed: { pageSize: 10 },
  theme: { default: "dark" },       // "dark" | "light" | "system"
});
```

Settings resolve as **CLI flags > `QUFOX_*` environment variables > config file >
defaults**.

## Publishing control

- **`opt-out`** (default) — everything is published except notes with
  `draft: true`, files or folders starting with `_`, and paths matching
  `publish.exclude` globs.
- **`opt-in`** — only notes with `publish: true` in their frontmatter are
  published. Point the engine at a whole vault safely.

## Obsidian compatibility

| Supported | Notes |
| --- | --- |
| Wikilinks `[[note]]`, `[[note\|alias]]`, `[[note#heading]]` | Resolved against the vault; unresolved links are styled distinctly. |
| Embeds `![[image.png\|300]]`, `![[note]]` | Images (with sizing), audio/video, and note transclusion. |
| Callouts `> [!note]` | All 13 types, aliases, folding, and nesting. |
| Tags `#tag` | Inline and frontmatter, including nested `#a/b`. |
| `==highlight==`, `%%comment%%`, footnotes, task lists | Comments are stripped; inline footnotes supported. |
| GFM | Tables, strikethrough, autolinks, task lists. |

**Not rendered yet** (shown as a visible "unsupported" note): math (`$…$`),
Mermaid, Dataview, Canvas, and Obsidian queries. These are on the roadmap or
intentionally out of scope, mirroring other Obsidian publishing tools.

## Blog features

Tag pages, a date archive, pagination, and full-text search (a command palette
opened with `/` or `Ctrl`/`⌘`+`K`). RSS/Atom feeds, sitemaps, and comments are
on the roadmap.

## Roadmap

- RSS/Atom + JSON Feed, `sitemap.xml`, richer SEO/OpenGraph tags
- Math and Mermaid rendering
- Comments (giscus)
- Distribution: Docker image, standalone binaries, Homebrew tap

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). By participating you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
