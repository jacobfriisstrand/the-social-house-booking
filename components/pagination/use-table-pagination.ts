"use client";

// The pagination state for the list tables, held in the URL (`page`,
// `pageSize`, lib/pagination). The writes go through
// window.history.replaceState — the Next.js docs' pattern for client-only
// search params: the URL updates and useSearchParams re-renders without a
// navigation, so paging never costs a server round trip (the rows are
// already in the browser). Defaults stay out of the URL.
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  PAGE_PARAM,
  PAGE_SIZE_PARAM,
  type PageSize,
  parsePage,
  parsePageSize,
} from "@/lib/pagination";

export interface PagedList {
  page: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
}

function writeParams(updates: {
  page?: number | null;
  pageSize?: number | null;
}): void {
  const params = new URLSearchParams(window.location.search);
  const page = updates.page ?? null;
  const pageSize = updates.pageSize ?? null;

  if (page === null || page <= 1) {
    params.delete(PAGE_PARAM);
  } else {
    params.set(PAGE_PARAM, String(page));
  }
  if (pageSize === null || pageSize === DEFAULT_PAGE_SIZE) {
    params.delete(PAGE_SIZE_PARAM);
  } else {
    params.set(PAGE_SIZE_PARAM, String(pageSize));
  }

  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname
  );
}

// A new view of the same table (tab switch) starts on its first page; the
// chosen page size carries over.
export function resetPaginationPage(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(PAGE_PARAM)) {
    return;
  }
  params.delete(PAGE_PARAM);
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname
  );
}

export function useTablePagination(totalItems: number): PagedList {
  const searchParams = useSearchParams();
  const pageSize = parsePageSize(searchParams.get(PAGE_SIZE_PARAM));
  const page = clampPage(
    parsePage(searchParams.get(PAGE_PARAM)),
    totalItems,
    pageSize
  );

  const setPage = useCallback((next: number) => {
    writeParams({ page: next });
  }, []);
  const setPageSize = useCallback((next: PageSize) => {
    // A new size restarts the view: a page beyond the shorter list would
    // read as an empty slice.
    writeParams({ page: null, pageSize: next });
  }, []);

  return { page, pageSize, setPage, setPageSize };
}
