---
"qufox-docs": minor
---

Remove the built-in full-text search. The command palette, the `/search` page,
and the `/pagefind/*` assets are gone, and Pagefind is no longer a dependency.
This drops a native binary that failed on some platforms (for example 16 KB-page
ARM64) and keeps the engine simple; search will return once the core features
are solid.
