import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ASSETS_DIR } from "../assets-dir.js";

interface ComponentsManifest {
  components: Array<{ name: string; iconMap?: Record<string, string> }>;
}

/** Obsidian callout aliases → canonical type (the fixed Obsidian spec). */
const ALIASES: Record<string, string> = {
  summary: "abstract",
  tldr: "abstract",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
};

const FALLBACK_ICON = "qf-i-info";

let cachedIconMap: Record<string, string> | undefined;

/** Icon sprite id for each callout type, read from the vendored design manifest. */
function iconMap(): Record<string, string> {
  if (cachedIconMap === undefined) {
    try {
      const manifest = JSON.parse(
        readFileSync(join(ASSETS_DIR, "design", "components.json"), "utf8"),
      ) as ComponentsManifest;
      const callout = manifest.components.find((component) => component.name === "Callout");
      cachedIconMap = callout?.iconMap ?? {};
    } catch {
      cachedIconMap = {};
    }
  }
  return cachedIconMap;
}

export interface CalloutType {
  /** Canonical type used for the `qf-callout--*` modifier. */
  canonical: string;
  /** Sprite id, e.g. "qf-i-sparkle". */
  icon: string;
}

/** Resolve an author-written callout keyword to its canonical type + icon. */
export function resolveCalloutType(raw: string): CalloutType {
  const lowered = raw.trim().toLowerCase();
  const canonical = ALIASES[lowered] ?? lowered;
  const map = iconMap();
  const icon = map[canonical] ?? map.note ?? FALLBACK_ICON;
  return { canonical: canonical in map ? canonical : "note", icon };
}

/** Default title (capitalized type) when the author gives none. */
export function defaultCalloutTitle(canonical: string): string {
  return canonical.charAt(0).toUpperCase() + canonical.slice(1);
}
