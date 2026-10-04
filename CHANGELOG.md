# qufox-docs

## 0.2.0

### Minor Changes

- [`67b2a6e`](https://github.com/talsu/qufox-docs/commit/67b2a6e05eced4bff8ebb8136a7ed03f4554088d) Thanks [@talsu](https://github.com/talsu)! - Add a brand and theme picker to the navbar: switch the design-system brand
  accent (qufox, ocean, forest, amber, rose) and the light/dark theme, both
  persisted to localStorage. The initial theme is now **light** with the **qufox**
  brand; override with `theme.default` / `theme.brand` in the config or the
  `QUFOX_THEME` / `QUFOX_BRAND` environment variables.

- [`fec77e2`](https://github.com/talsu/qufox-docs/commit/fec77e21a6f0883fd2f3e64b6aa7a2f019f9a959) Thanks [@talsu](https://github.com/talsu)! - Browse the vault by folder. The published notes are now navigable as a folder
  tree in two places: a `/browse` page linked from the navbar, and a left drawer
  that opens on any page from the navbar's folder button — so you can jump to a
  neighbouring note without leaving the one you are reading.

  Folders are `<details>` elements, so expanding and collapsing needs no JavaScript
  and survives static export. On a note page the tree opens at that note's folder
  and marks it with `aria-current="page"`. Folders sort before notes, a folder's
  own `index`/`README` leads its siblings, and unpublished notes (and the folders
  that would be left empty) stay out.

- [`61b86e5`](https://github.com/talsu/qufox-docs/commit/61b86e55bc0f674095300497c44d64a7f0f1bb31) Thanks [@talsu](https://github.com/talsu)! - Adopt design system v0.15.0. Tags are `qf-tag` links everywhere — in feed entries,
  the side column, and the tag index, with a quiet post count (`qf-tag__count`) — and
  the older/newer links at the end of a post are the new `qf-postnav` component. A
  post shows up to five tags under its title; a longer list continues after the
  article. The navbar's narrow-width behaviour and the footer icon spacing now come
  from the design system instead of engine styles.

- [`2cedaec`](https://github.com/talsu/qufox-docs/commit/2cedaecc7e2e5c84f33fd9d753062ae3362b2110) Thanks [@talsu](https://github.com/talsu)! - Publish an RSS feed (`/feed.xml`, newest `feed.limit` posts), a `/sitemap.xml`, and a
  `/robots.txt`, and add canonical, OpenGraph, and feed-discovery tags to every page.
  The feed, sitemap, and canonical URLs need absolute addresses, so they appear once
  `site.url` is set. `site.favicon` points at an image in the vault to use as the site
  icon.

- [`2cedaec`](https://github.com/talsu/qufox-docs/commit/2cedaecc7e2e5c84f33fd9d753062ae3362b2110) Thanks [@talsu](https://github.com/talsu)! - Keep old URLs alive after a migration. A note lists its former addresses in
  `redirect_from` frontmatter — a path (`/2011/11/remoting/`) or a path with a query
  string (`/?p=2117`, the WordPress "plain" permalink) — and site-wide rules go in the
  new `redirects` config, where a trailing `*` forwards a whole folder
  (`/wp-content/uploads/*`). `serve` answers with a `301`; a path redirect only applies
  where the site would otherwise return 404, so it never hides a live page. A static
  `build` writes a forwarding page per plain path and reports the rules that need a
  server.

- [`377dd6f`](https://github.com/talsu/qufox-docs/commit/377dd6f64705bd8d0f49a0d83cd17049091da1fa) Thanks [@talsu](https://github.com/talsu)! - Resolve Markdown-style links between notes (`[text](note.md)`,
  `[text](sub/note.md#heading)`) to their slug URLs, the same way wikilinks
  resolve — previously these kept the `.md` extension and 404'd. Links to
  non-notes (images, external files) are left untouched. Also inline the design
  system icon sprite so `<use href="#qf-i-…">` references render (the theme
  toggle, table-of-contents button, and callout icons were invisible without it).

- [`55d1e4b`](https://github.com/talsu/qufox-docs/commit/55d1e4bd10848bad24b7739e0c669eebc462a59a) Thanks [@talsu](https://github.com/talsu)! - A reading layout for the blog, on design system v0.14.0. Feeds are now lists of
  stories — date, title, a three-line summary, the first few tags, and the post's
  lead image as a thumbnail (the `image` frontmatter, else the first image in the
  body). On wide screens the home feed gains a side column with the busiest tags,
  the years, and the RSS link. Every page ends in a footer, long pages offer a
  back-to-top button, and the navbar fits a phone (the brand-accent picker steps
  aside below 640px). A post's lead image also becomes its `og:image`.

  The interface speaks the language of `site.locale`: Korean (`ko`) is built in,
  everything else falls back to English.

- [`d5d87bb`](https://github.com/talsu/qufox-docs/commit/d5d87bbda385aa5affdf5b85d9d9f24f42da2ba5) Thanks [@talsu](https://github.com/talsu)! - Resolve vault-relative media URLs written as raw HTML — `<img src="img/photo.png">`,
  `<video src="clip.mp4" poster="thumb.jpg">` — to their served `/assets/vault/…` URL, the
  same way `![alt](img/photo.png)` and `![[photo.png]]` resolve. Obsidian resolves these
  against the note's folder, so notes that use HTML for layout (images inside a table,
  sized thumbnails) rendered broken on the site while looking fine in the vault. `img`,
  `video`, `audio`, and `source` elements are covered; external and unmatched URLs are
  left untouched.

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

- [`1efb9b1`](https://github.com/talsu/qufox-docs/commit/1efb9b138db659926d14731dd8cc172823f982c8) Thanks [@talsu](https://github.com/talsu)! - A `robots.txt` at the root of the content folder is now served as the site's
  `/robots.txt` (and written by `build`), so a site can set its own crawling policy.
  Without one the engine keeps generating the allow-all file that announces the sitemap.

### Patch Changes

- [`64b2d35`](https://github.com/talsu/qufox-docs/commit/64b2d3514a31e31d955485a53098e53b1fbf454f) Thanks [@talsu](https://github.com/talsu)! - Render `**bold**` and `*italic*` that close right before Korean, Japanese, or Chinese
  text — `수행**(연산)**속도` used to show the asterisks. Inline `#tag` links now follow
  the index: text the index does not count as a tag (an escaped `\#include`, a `#word`
  wrapped in emphasis) is left as text instead of linking to a tag page that does not
  exist.

- [`f3a6b1e`](https://github.com/talsu/qufox-docs/commit/f3a6b1e3a9ce751062d6a9d8a1a3b5e345046c60) Thanks [@talsu](https://github.com/talsu)! - Sync design system v0.16.0: the monospace fallback stack now includes Cascadia Mono
  and Consolas, so code stays readable on Windows even if the brand font fails to load.

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

- [`bd16212`](https://github.com/talsu/qufox-docs/commit/bd162123ba9d2b9e27f00672bbca6634144dc86e) Thanks [@talsu](https://github.com/talsu)! - Serve the design system's brand fonts (Geist Mono for code, Space Grotesk for Latin
  headings and text) from the engine. Until now no font was loaded, so code fell back
  to the system's generic monospace — on Korean Windows a wide CJK face that made code
  blocks and inline code look heavy and loosely spaced. The fonts are vendored (Latin
  subset, SIL OFL), so sites still make no third-party requests.

## 0.1.0

### Minor Changes

- [`b333b78`](https://github.com/talsu/qufox-docs/commit/b333b784adb6ea5736c128e5d90277b5f9c58f30) Thanks [@talsu](https://github.com/talsu)! - Initial release. Serve a folder of Obsidian-flavored Markdown as a live blog:
  wikilinks, embeds, callouts, tags, and highlights rendered with the qufox
  design system; a blog-style home feed with tag pages, a date archive,
  pagination, and full-text search; live reload on save; and a static-site
  export for deployment.
