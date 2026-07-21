---
"qufox-docs": patch
---

Paint design-system icons as outlines in the current text color. The vendored design
system sizes its Lucide-style icons per context but never sets their paint, so bare
`<use>` icons fell back to a solid black fill — the theme-toggle sun rendered as a dot
and the moon as a black crescent, both invisible on the dark navbar.
