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
  PAGE_PARAM,
  PAGE_SIZE_PARAM,
  type PageSize,
  parsePage,
  parsePageSize,
  updatedPaginationQuery,
} from "@/lib/pagination";

export interface PagedList {
  page: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
}

function writeQuery(query: string): void {
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname
  );
}

// A new view of the same table (tab switch) starts on its first page; the
// chosen page size carries over.
export function resetPaginationPage(): void {
  if (!new URLSearchParams(window.location.search).has(PAGE_PARAM)) {
    return;
  }
  writeQuery(updatedPaginationQuery({ page: null }, window.location.search));
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
    writeQuery(updatedPaginationQuery({ page: next }, window.location.search));
  }, []);
  const setPageSize = useCallback((next: PageSize) => {
    // A new size restarts the view: a page beyond the shorter list would
    // read as an empty slice.
    writeQuery(
      updatedPaginationQuery(
        { page: null, pageSize: next },
        window.location.search
      )
    );
  }, []);

  return { page, pageSize, setPage, setPageSize };
}
