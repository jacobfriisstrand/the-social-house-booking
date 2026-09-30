"use client";

// The footer of every paginated table, drawn after the shadcn "icons only"
// example (2026-09-29, sides swapped back the same day): the rows-per-page
// field on the left, and the "Viser X–Y af Z" summary with the icon
// Previous/Next on the right — the summary carries the position, since
// there are no page-number buttons. A caller may pass a note (the
// "Alle priser ekskl. moms" line); it sits directly above the arrows.
// Renders nothing for an empty list.
import { useCallback, useId } from "react";
import type { PagedList } from "@/components/pagination/use-table-pagination";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAGE_SIZE_OPTIONS,
  pageWindow,
  parsePageSize,
  totalPages,
} from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.pagination;

export function TablePagination({
  note,
  paged,
  totalItems,
}: {
  note?: string;
  paged: PagedList;
  totalItems: number;
}) {
  const selectId = useId();

  const lastPage = totalPages(totalItems, paged.pageSize);
  const { from, to } = pageWindow(paged.page, paged.pageSize, totalItems);
  const { page, setPage, setPageSize } = paged;
  const sizeItems = PAGE_SIZE_OPTIONS.map((size) => ({
    label: String(size),
    value: String(size),
  }));

  const handleSizeChange = useCallback(
    (value: unknown) => {
      if (typeof value === "string") {
        setPageSize(parsePageSize(value));
      }
    },
    [setPageSize]
  );
  const handlePrevious = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);
  const handleNext = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <Field className="w-fit" orientation="horizontal">
        <FieldLabel htmlFor={selectId}>{copy.rowsPerPage}</FieldLabel>
        <Select
          items={sizeItems}
          onValueChange={handleSizeChange}
          value={String(paged.pageSize)}
        >
          <SelectTrigger className="w-16" id={selectId} size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {sizeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex flex-col items-end gap-1">
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-muted-foreground text-xs">
            {copy.summary(from, to, totalItems)}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-label={copy.previous}
                  disabled={page <= 1}
                  onClick={handlePrevious}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  aria-label={copy.next}
                  disabled={page >= lastPage}
                  onClick={handleNext}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
