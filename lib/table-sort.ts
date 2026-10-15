// Column sorting for the Bookinger lists, admin and member alike: one
// column's value per row, Danish collation for text, nulls last in both
// directions so "-" cells never jump around, and ties in start order so
// equal keys never shuffle the list. The URL carries the column and the
// direction; the header reads its state from columnSortState.

export type SortDirection = "asc" | "desc";

/** One row's value in the sorted column: a number, a text, or null for "-". */
export type SortValue = number | string | null;

function compareColumn(
  left: SortValue,
  right: SortValue,
  sign: 1 | -1
): number {
  if (left === null || right === null) {
    // Nulls last whatever the direction: the sign never touches them.
    return Number(left === null) - Number(right === null);
  }
  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right, "da") * sign;
  }
  return (Number(left) - Number(right)) * sign;
}

/** The rows ordered by one column's value, ties in start order. */
export function sortByColumn<T>(
  rows: readonly T[],
  value: (row: T) => SortValue,
  direction: SortDirection,
  startMs: (row: T) => number
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return rows.toSorted((left, right) => {
    const primary = compareColumn(value(left), value(right), sign);
    return primary === 0 ? startMs(left) - startMs(right) : primary;
  });
}

/** What a sortable header shows and does: its aria-sort, the arrow, and
 * the direction a click sorts by next — ascending first, then a toggle. */
export interface ColumnSortState {
  ariaSort: "ascending" | "descending" | undefined;
  // The direction the column sorts by now; null while another column sorts.
  direction: SortDirection | null;
  nextDirection: SortDirection;
}

export function columnSortState(
  active: boolean,
  direction: SortDirection
): ColumnSortState {
  if (!active) {
    return { ariaSort: undefined, direction: null, nextDirection: "asc" };
  }
  return direction === "asc"
    ? { ariaSort: "ascending", direction, nextDirection: "desc" }
    : { ariaSort: "descending", direction, nextDirection: "asc" };
}
