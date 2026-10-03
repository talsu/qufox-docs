---
"qufox-docs": patch
---

Render `**bold**` and `*italic*` that close right before Korean, Japanese, or Chinese
text — `수행**(연산)**속도` used to show the asterisks. Inline `#tag` links now follow
the index: text the index does not count as a tag (an escaped `\#include`, a `#word`
wrapped in emphasis) is left as text instead of linking to a tag page that does not
exist.
