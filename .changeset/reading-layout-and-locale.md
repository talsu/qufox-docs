---
"qufox-docs": minor
---

A reading layout for the blog, on design system v0.14.0. Feeds are now lists of
stories — date, title, a three-line summary, the first few tags, and the post's
lead image as a thumbnail (the `image` frontmatter, else the first image in the
body). On wide screens the home feed gains a side column with the busiest tags,
the years, and the RSS link. Every page ends in a footer, long pages offer a
back-to-top button, and the navbar fits a phone (the brand-accent picker steps
aside below 640px). A post's lead image also becomes its `og:image`.

The interface speaks the language of `site.locale`: Korean (`ko`) is built in,
everything else falls back to English.
