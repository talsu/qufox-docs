import { describe, expect, it } from "vitest";
import { parseTagPath } from "../../src/server/app.js";
import { paginate } from "../../src/site/pagination.js";

describe("paginate", () => {
  it("slices the first page", () => {
    expect(paginate(25, 1, 10)).toEqual({ page: 1, totalPages: 3, start: 0, end: 10 });
  });

  it("slices a middle page", () => {
    expect(paginate(25, 2, 10)).toEqual({ page: 2, totalPages: 3, start: 10, end: 20 });
  });

  it("clamps the last page to the total", () => {
    expect(paginate(25, 3, 10)).toEqual({ page: 3, totalPages: 3, start: 20, end: 25 });
  });

  it("treats an empty collection as one page", () => {
    expect(paginate(0, 1, 10)).toEqual({ page: 1, totalPages: 1, start: 0, end: 0 });
  });

  it("rejects out-of-range and non-integer pages", () => {
    expect(paginate(25, 0, 10)).toBeNull();
    expect(paginate(25, 4, 10)).toBeNull();
    expect(paginate(25, 1.5, 10)).toBeNull();
    expect(paginate(25, Number.NaN, 10)).toBeNull();
  });
});

describe("parseTagPath", () => {
  it("parses a plain tag", () => {
    expect(parseTagPath("project")).toEqual({ tag: "project", pageNum: 1 });
  });

  it("parses nested tags", () => {
    expect(parseTagPath("inbox/to-read")).toEqual({ tag: "inbox/to-read", pageNum: 1 });
  });

  it("splits off a page suffix", () => {
    expect(parseTagPath("project/page/2")).toEqual({ tag: "project", pageNum: 2 });
    expect(parseTagPath("inbox/to-read/page/3")).toEqual({ tag: "inbox/to-read", pageNum: 3 });
  });

  it("lowercases and trims trailing slashes", () => {
    expect(parseTagPath("Project/")).toEqual({ tag: "project", pageNum: 1 });
  });
});
