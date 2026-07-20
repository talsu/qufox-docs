# qufox-docs

Serve a folder of Obsidian-flavored Markdown as a modern blog — live.

Point qufox-docs at any directory of Markdown files (an Obsidian vault, a notes
folder, a docs tree) and it becomes a website on the spot: edits show up in the
browser as you save, no build step in your writing loop. The same content can
also be exported as a fully static site.

> **Status:** early development — not yet published to npm.

## Quick start

```sh
npx qufox-docs serve ./notes
```

## Goals

- **Live by default** — watch the filesystem, render on request, reload the browser on save.
- **Obsidian-friendly** — wikilinks, embeds, callouts, tags, and highlights render the way you wrote them.
- **One design system** — every page is built from [qufox design](https://design.qufox.com) components and tokens.
- **Engine, not a template** — install it, point it at your content, done. Your content never lives in this repo.

## License

[MIT](LICENSE)
