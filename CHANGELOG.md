# qufox-docs

## 0.2.0

### Minor Changes

- [`67b2a6e`](https://github.com/talsu/qufox-docs/commit/67b2a6e05eced4bff8ebb8136a7ed03f4554088d) Thanks [@talsu](https://github.com/talsu)! - Add a brand and theme picker to the navbar: switch the design-system brand
  accent (qufox, ocean, forest, amber, rose) and the light/dark theme, both
  persisted to localStorage. The initial theme is now **light** with the **qufox**
  brand; override with `theme.default` / `theme.brand` in the config or the
  `QUFOX_THEME` / `QUFOX_BRAND` environment variables.

- [`377dd6f`](https://github.com/talsu/qufox-docs/commit/377dd6f64705bd8d0f49a0d83cd17049091da1fa) Thanks [@talsu](https://github.com/talsu)! - Resolve Markdown-style links between notes (`[text](note.md)`,
  `[text](sub/note.md#heading)`) to their slug URLs, the same way wikilinks
  resolve — previously these kept the `.md` extension and 404'd. Links to
  non-notes (images, external files) are left untouched. Also inline the design
  system icon sprite so `<use href="#qf-i-…">` references render (the theme
  toggle, table-of-contents button, and callout icons were invisible without it).

- [`b53391f`](https://github.com/talsu/qufox-docs/commit/b53391f86fd70d6e4d263586b239ed7c8c13ad52) Thanks [@talsu](https://github.com/talsu)! - Resolve standard Markdown images (`![alt](img/photo.png)`, `![alt](../assets/pic.png)`)
  that point at a vault attachment to their served `/assets/vault/…` URL, the same way
  `![[photo.png]]` embeds resolve — previously these kept their authored relative path and
  404'd. External and unmatched image URLs are left untouched.

  Also apply Obsidian image size hints written in the alt text — `![alt|300](url)` and
  `![alt|300x200](url)` — as `width`/`height`, matching how `![[img|300]]` embeds size
  their media. A non-numeric `|…` suffix stays as alt text.

- [`a05c7d4`](https://github.com/talsu/qufox-docs/commit/a05c7d41a5920f524fc31357c75a42f2d5dbcbcb) Thanks [@talsu](https://github.com/talsu)! - Remove the built-in full-text search. The command palette, the `/search` page,
  and the `/pagefind/*` assets are gone, and Pagefind is no longer a dependency.
  This drops a native binary that failed on some platforms (for example 16 KB-page
  ARM64) and keeps the engine simple; search will return once the core features
  are solid.

### Patch Changes

- [`3a9377e`](https://github.com/talsu/qufox-docs/commit/3a9377e1e88f83785d82ef03b8aab82d1a4a6f7f) Thanks [@talsu](https://github.com/talsu)! - Upgrade the vendored qufox design system to v0.6.2 and drop the engine-side
  bridge styles it now handles natively:

  - Load the new `icons.css` and rely on the sprite's baked paint, removing the
    `.qf-icon` outline-paint bridge.
  - Widen article bodies via the DS `--qf-prose-max` override token instead of
    forcing `max-width: none`.
  - Remove the `.qf-table-wrap` sizing, `.qf-drawer[hidden]`, and structural-link
    color bridges — the design system now ships equivalents.

- [`b1cb99d`](https://github.com/talsu/qufox-docs/commit/b1cb99d260c58f49afbb12de900475bf4e462455) Thanks [@talsu](https://github.com/talsu)! - Paint design-system icons as outlines in the current text color. The vendored design
  system sizes its Lucide-style icons per context but never sets their paint, so bare
  `<use>` icons fell back to a solid black fill — the theme-toggle sun rendered as a dot
  and the moon as a black crescent, both invisible on the dark navbar.

- [`64ee813`](https://github.com/talsu/qufox-docs/commit/64ee813307589194fade19a83f3933ce2ee78dfa) Thanks [@talsu](https://github.com/talsu)! - UI polish: card titles, list rows, and whole-card links now inherit the design
  system's text color instead of showing as default browser links; the content
  column uses the standard container width and stays centered; and the "On this
  page" table of contents is a drawer that is hidden by default and opened from
  the navbar — floating in the right margin on wide screens and overlaying the
  content on narrow ones, with its heading tree always expanded.

## 0.1.0

### Minor Changes

- [`b333b78`](https://github.com/talsu/qufox-docs/commit/b333b784adb6ea5736c128e5d90277b5f9c58f30) Thanks [@talsu](https://github.com/talsu)! - Initial release. Serve a folder of Obsidian-flavored Markdown as a live blog:
  wikilinks, embeds, callouts, tags, and highlights rendered with the qufox
  design system; a blog-style home feed with tag pages, a date archive,
  pagination, and full-text search; live reload on save; and a static-site
  export for deployment.
