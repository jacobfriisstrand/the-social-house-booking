import { describe, expect, it } from "vitest";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageWindow,
  parsePage,
  parsePageSize,
  slicePage,
  totalPages,
  updatedPaginationQuery,
} from "./pagination";

describe("parsePageSize", () => {
  it("accepts the offered sizes", () => {
    expect(parsePageSize("20")).toBe(20);
    expect(parsePageSize("40")).toBe(40);
    expect(parsePageSize("60")).toBe(60);
    expect(parsePageSize("80")).toBe(80);
  });

  it("reads anything else as the default", () => {
    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("25")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("-1")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("0x2")).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("parsePage", () => {
  it("accepts positive integers", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });

  it("reads anything else as the first page", () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("totalPages and clampPage", () => {
  it("never returns fewer than one page", () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(1, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(80, 80)).toBe(1);
    expect(totalPages(81, 80)).toBe(2);
  });

  it("clamps a page beyond the data to the last page with rows", () => {
    expect(clampPage(3, 45, 20)).toBe(3);
    expect(clampPage(9, 45, 20)).toBe(3);
    expect(clampPage(5, 0, 20)).toBe(1);
  });

  it("keeps a page inside the data as is", () => {
    expect(clampPage(2, 45, 20)).toBe(2);
  });
});

describe("slicePage", () => {
  it("cuts the requested page out of the list", () => {
    const items = [1, 2, 3, 4, 5];
    expect(slicePage(items, 1, 2)).toEqual([1, 2]);
    expect(slicePage(items, 2, 2)).toEqual([3, 4]);
    expect(slicePage(items, 3, 2)).toEqual([5]);
    expect(slicePage(items, 4, 2)).toEqual([]);
  });

  it("returns the whole list on one page", () => {
    expect(slicePage([1, 2], 1, 80)).toEqual([1, 2]);
  });

  it("does not mutate the source list", () => {
    const items = [1, 2, 3];
    slicePage(items, 1, 2);
    expect(items).toEqual([1, 2, 3]);
  });
});

describe("pageWindow", () => {
  it("states the 1-based inclusive range", () => {
    expect(pageWindow(1, 20, 47)).toEqual({ from: 1, to: 20 });
    expect(pageWindow(2, 20, 47)).toEqual({ from: 21, to: 40 });
    expect(pageWindow(3, 20, 47)).toEqual({ from: 41, to: 47 });
  });

  it("reads a clamped empty page as nothing shown", () => {
    expect(pageWindow(1, 20, 0)).toEqual({ from: 1, to: 0 });
  });
});

describe("updatedPaginationQuery", () => {
  it("keeps a page beyond the first and drops the first", () => {
    expect(updatedPaginationQuery({ page: 2 }, "")).toBe("page=2");
    expect(updatedPaginationQuery({ page: 1 }, "?page=3")).toBe("");
  });

  it("keeps a non-default size and drops the default", () => {
    expect(updatedPaginationQuery({ pageSize: 40 }, "")).toBe("pageSize=40");
    expect(updatedPaginationQuery({ pageSize: 20 }, "?pageSize=60")).toBe("");
  });

  it("restarts the page when the size changes", () => {
    expect(
      updatedPaginationQuery(
        { page: null, pageSize: 60 },
        "?page=4&pageSize=20"
      )
    ).toBe("pageSize=60");
  });

  it("leaves unrelated params untouched", () => {
    expect(
      updatedPaginationQuery({ page: 5 }, "?dato=2026-10-01&personer=6&page=3")
    ).toBe("dato=2026-10-01&personer=6&page=5");
  });

  it("reads a null page as a reset", () => {
    expect(updatedPaginationQuery({ page: null }, "?page=7&pageSize=40")).toBe(
      "pageSize=40"
    );
  });

  it("leaves the page size alone when only the page changes", () => {
    expect(updatedPaginationQuery({ page: 2 }, "?pageSize=40")).toBe(
      "pageSize=40&page=2"
    );
  });
});
