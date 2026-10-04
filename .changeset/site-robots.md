---
"qufox-docs": minor
---

A `robots.txt` at the root of the content folder is now served as the site's
`/robots.txt` (and written by `build`), so a site can set its own crawling policy.
Without one the engine keeps generating the allow-all file that announces the sitemap.
