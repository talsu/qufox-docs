---
"qufox-docs": minor
---

Resolve vault-relative media URLs written as raw HTML — `<img src="img/photo.png">`,
`<video src="clip.mp4" poster="thumb.jpg">` — to their served `/assets/vault/…` URL, the
same way `![alt](img/photo.png)` and `![[photo.png]]` resolve. Obsidian resolves these
against the note's folder, so notes that use HTML for layout (images inside a table,
sized thumbnails) rendered broken on the site while looking fine in the vault. `img`,
`video`, `audio`, and `source` elements are covered; external and unmatched URLs are
left untouched.
