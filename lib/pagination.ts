// Client-side pagination for the list tables: every table's rows are
// already loaded in the browser, so a page is a slice of memory — no query
// changes, and the tab counts and sidebar badges stay exact against the
// same data. The page and page size live in the URL (`page`, `pageSize`)
// so back-button and links land on the same view; the defaults stay out of
// the URL. Pure logic; the client hook that touches the URL lives in
// components/pagination/use-table-pagination.ts.
export const PAGE_SIZE_OPTIONS = [20, 40, 60, 80] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 20;

export const PAGE_PARAM = "page";
export const PAGE_SIZE_PARAM = "pageSize";

// The URL contract for the pagination params, applied over the current
// query: the defaults drop out of the URL, a change overwrites its key, an
// explicit null drops the key, and any key the updates do not mention —
// the page size survives a page change, the page survives a size reset —
// plus any unrelated params (a room search, an invite status) stay
// untouched. Returns the bare query — empty when nothing is left.
export function updatedPaginationQuery(
  updates: { page?: number | null; pageSize?: number | null },
  currentSearch: string
): string {
  const params = new URLSearchParams(currentSearch);

  if (updates.page !== undefined) {
    const { page } = updates;
    if (page === null || page <= 1) {
      params.delete(PAGE_PARAM);
    } else {
      params.set(PAGE_PARAM, String(page));
    }
  }
  if (updates.pageSize !== undefined) {
    const { pageSize } = updates;
    if (pageSize === null || pageSize === DEFAULT_PAGE_SIZE) {
      params.delete(PAGE_SIZE_PARAM);
    } else {
      params.set(PAGE_SIZE_PARAM, String(pageSize));
    }
  }

  return params.toString();
}

// Anything that is not one of the offered sizes reads as the default.
export function parsePageSize(value: string | null): PageSize {
  const parsed = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as PageSize)
    : DEFAULT_PAGE_SIZE;
}

// 1-based; anything unusable reads as the first page.
export function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function totalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

// A page beyond the data (rows deleted elsewhere, tab switched, page size
// grown) reads as the last page with rows instead of an empty slice.
export function clampPage(
  page: number,
  totalItems: number,
  pageSize: number
): number {
  return Math.min(page, totalPages(totalItems, pageSize));
}

export function slicePage<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

// The "Viser X–Y af Z" window: 1-based, inclusive. Empty lists never reach
// this (the pagination footer only renders with rows).
export function pageWindow(
  page: number,
  pageSize: number,
  totalItems: number
): { from: number; to: number } {
  return {
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, totalItems),
  };
}
