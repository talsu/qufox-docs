import picomatch from "picomatch";
import type { ResolvedConfig } from "../config/schema.js";
import type { NoteFrontmatter } from "../types.js";

export type PublishSettings = Pick<ResolvedConfig, "publish">["publish"];

export type PublishGate = (relPath: string, frontmatter: NoteFrontmatter) => boolean;

/** True when any path segment is hidden (`_` or `.` prefix). */
export function hasHiddenSegment(relPath: string): boolean {
  return relPath.split("/").some((segment) => segment.startsWith("_") || segment.startsWith("."));
}

/**
 * Build the publish predicate for the configured mode.
 *
 * Hidden segments and `exclude` globs are never published in either mode.
 * "opt-out" publishes everything else unless `draft: true` or `publish: false`;
 * "opt-in" publishes only notes with `publish: true`.
 */
export function createPublishGate(publish: PublishSettings): PublishGate {
  const isExcluded =
    publish.exclude.length > 0 ? picomatch(publish.exclude, { dot: true }) : () => false;

  return (relPath, frontmatter) => {
    if (hasHiddenSegment(relPath)) return false;
    if (isExcluded(relPath)) return false;
    if (publish.mode === "opt-in") return frontmatter.publish === true;
    return frontmatter.draft !== true && frontmatter.publish !== false;
  };
}
