// The Bookinger lists' column sort: nulls stay last in both directions,
// text sorts in Danish order, ties keep start order, and a header click
// sorts ascending first, then toggles.
import { describe, expect, it } from "vitest";
import { columnSortState, type SortValue, sortByColumn } from "./table-sort";

interface Row {
  id: string;
  start: number;
  value: SortValue;
}

const row = (id: string, value: SortValue, start = 0): Row => ({
  id,
  start,
  value,
});

const sortIds = (rows: Row[], direction: "asc" | "desc"): string[] =>
  sortByColumn(
    rows,
    (entry) => entry.value,
    direction,
    (entry) => entry.start
  ).map((entry) => entry.id);

describe("sortByColumn", () => {
  it("sorts numbers both ways with nulls last", () => {
    const rows = [row("none", null), row("big", 500), row("small", 100)];
    expect(sortIds(rows, "asc")).toEqual(["small", "big", "none"]);
    expect(sortIds(rows, "desc")).toEqual(["big", "small", "none"]);
  });

  it("sorts text in Danish order", () => {
    const rows = [row("aa", "Åen"), row("z", "Zebra"), row("ae", "Ægget")];
    expect(sortIds(rows, "asc")).toEqual(["z", "ae", "aa"]);
  });

  it("keeps ties in start order whatever the direction", () => {
    const rows = [row("late", 1, 20), row("early", 1, 10)];
    expect(sortIds(rows, "asc")).toEqual(["early", "late"]);
    expect(sortIds(rows, "desc")).toEqual(["early", "late"]);
  });

  it("leaves the input untouched", () => {
    const rows = [row("b", 2), row("a", 1)];
    sortIds(rows, "asc");
    expect(rows.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});

describe("columnSortState", () => {
  it("an idle column shows no direction and sorts ascending on click", () => {
    expect(columnSortState(false, "desc")).toEqual({
      ariaSort: undefined,
      direction: null,
      nextDirection: "asc",
    });
  });

  it("the sorted column toggles its direction", () => {
    expect(columnSortState(true, "asc")).toEqual({
      ariaSort: "ascending",
      direction: "asc",
      nextDirection: "desc",
    });
    expect(columnSortState(true, "desc")).toEqual({
      ariaSort: "descending",
      direction: "desc",
      nextDirection: "asc",
    });
  });
});
