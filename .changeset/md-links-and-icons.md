---
"qufox-docs": minor
---

Resolve Markdown-style links between notes (`[text](note.md)`,
`[text](sub/note.md#heading)`) to their slug URLs, the same way wikilinks
resolve — previously these kept the `.md` extension and 404'd. Links to
non-notes (images, external files) are left untouched. Also inline the design
system icon sprite so `<use href="#qf-i-…">` references render (the theme
toggle, table-of-contents button, and callout icons were invisible without it).
