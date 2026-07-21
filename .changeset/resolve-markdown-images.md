---
"qufox-docs": minor
---

Resolve standard Markdown images (`![alt](img/photo.png)`, `![alt](../assets/pic.png)`)
that point at a vault attachment to their served `/assets/vault/…` URL, the same way
`![[photo.png]]` embeds resolve — previously these kept their authored relative path and
404'd. External and unmatched image URLs are left untouched.

Also apply Obsidian image size hints written in the alt text — `![alt|300](url)` and
`![alt|300x200](url)` — as `width`/`height`, matching how `![[img|300]]` embeds size
their media. A non-numeric `|…` suffix stays as alt text.
