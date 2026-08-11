---
"qufox-docs": minor
---

Browse the vault by folder. The published notes are now navigable as a folder
tree in two places: a `/browse` page linked from the navbar, and a left drawer
that opens on any page from the navbar's folder button — so you can jump to a
neighbouring note without leaving the one you are reading.

Folders are `<details>` elements, so expanding and collapsing needs no JavaScript
and survives static export. On a note page the tree opens at that note's folder
and marks it with `aria-current="page"`. Folders sort before notes, a folder's
own `index`/`README` leads its siblings, and unpublished notes (and the folders
that would be left empty) stay out.
