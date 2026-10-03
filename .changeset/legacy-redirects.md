---
"qufox-docs": minor
---

Keep old URLs alive after a migration. A note lists its former addresses in
`redirect_from` frontmatter — a path (`/2011/11/remoting/`) or a path with a query
string (`/?p=2117`, the WordPress "plain" permalink) — and site-wide rules go in the
new `redirects` config, where a trailing `*` forwards a whole folder
(`/wp-content/uploads/*`). `serve` answers with a `301`; a path redirect only applies
where the site would otherwise return 404, so it never hides a live page. A static
`build` writes a forwarding page per plain path and reports the rules that need a
server.
