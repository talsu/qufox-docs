/**
 * String pre-pass applied before parsing. Code (fenced blocks and inline
 * spans) is masked first so the transforms never touch it:
 *   - strip Obsidian comments `%%...%%` (inline and multi-line)
 *   - rewrite inline footnotes `^[text]` to GFM `[^id]` + appended definitions
 */
export function preprocess(raw: string): string {
  const { masked, restore } = maskCode(raw);

  let text = masked.replace(/%%[\s\S]*?%%/g, "");

  const footnotes: string[] = [];
  let counter = 0;
  text = text.replace(/\^\[([^\]]+)\]/g, (_, content: string) => {
    const id = `fn-inline-${++counter}`;
    footnotes.push(`[^${id}]: ${content.trim()}`);
    return `[^${id}]`;
  });

  let output = restore(text);
  if (footnotes.length > 0) {
    output = `${output.replace(/\n+$/, "")}\n\n${footnotes.join("\n")}\n`;
  }
  return output;
}

interface MaskResult {
  masked: string;
  restore: (text: string) => string;
}

// A private-use code point survives markdown untouched and never appears in
// real source, so it delimits placeholders unambiguously.
const SENTINEL = String.fromCharCode(0xe000);

/** Replace fenced code blocks and inline code spans with opaque placeholders. */
function maskCode(raw: string): MaskResult {
  const store: string[] = [];
  const keep = (value: string): string => {
    store.push(value);
    return `${SENTINEL}${store.length - 1}${SENTINEL}`;
  };

  const lines = raw.split("\n");
  const out: string[] = [];
  let fence: { marker: string; buffer: string[] } | null = null;

  for (const line of lines) {
    const openMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence === null && openMatch) {
      fence = { marker: (openMatch[1] ?? "")[0] ?? "`", buffer: [line] };
      continue;
    }
    if (fence !== null) {
      fence.buffer.push(line);
      const closeMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (closeMatch && ((closeMatch[1] ?? "")[0] ?? "") === fence.marker) {
        out.push(keep(fence.buffer.join("\n")));
        fence = null;
      }
      continue;
    }
    out.push(line.replace(/`[^`]*`/g, (span) => keep(span)));
  }
  // An unterminated fence: keep its collected text as-is (parser will handle it).
  if (fence !== null) out.push(fence.buffer.join("\n"));

  const restore = (text: string): string =>
    text.replace(
      new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, "g"),
      (_, index) => store[Number(index)] ?? "",
    );

  return { masked: out.join("\n"), restore };
}
