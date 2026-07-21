---
"qufox-docs": minor
---

Resolve standard Markdown images (`![alt](img/photo.png)`, `![alt](../assets/pic.png)`)
that point at a vault attachment to their served `/assets/vault/…` URL, the same way
`![[photo.png]]` embeds resolve — previously these kept their authored relative path and
404'd. External and unmatched image URLs are left untouched.
