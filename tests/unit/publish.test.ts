import { describe, expect, it } from "vitest";
import { createPublishGate } from "../../src/content/publish.js";

describe("createPublishGate (opt-out)", () => {
  const gate = createPublishGate({ mode: "opt-out", exclude: ["private/**"] });

  it("publishes plain notes by default", () => {
    expect(gate("note.md", {})).toBe(true);
  });

  it("excludes drafts and publish: false", () => {
    expect(gate("note.md", { draft: true })).toBe(false);
    expect(gate("note.md", { publish: false })).toBe(false);
  });

  it("excludes underscore-prefixed files and folders", () => {
    expect(gate("_private/secret.md", {})).toBe(false);
    expect(gate("folder/_hidden.md", {})).toBe(false);
  });

  it("excludes configured globs", () => {
    expect(gate("private/journal.md", {})).toBe(false);
    expect(gate("public/journal.md", {})).toBe(true);
  });
});

describe("createPublishGate (opt-in)", () => {
  const gate = createPublishGate({ mode: "opt-in", exclude: [] });

  it("publishes only notes with publish: true", () => {
    expect(gate("note.md", {})).toBe(false);
    expect(gate("note.md", { publish: true })).toBe(true);
  });

  it("still blocks hidden segments even with publish: true", () => {
    expect(gate("_private/note.md", { publish: true })).toBe(false);
  });
});
