"use client";

// The footer of every paginated table, drawn after the shadcn "icons only"
// example: the optional note (the member "Alle priser ekskl. moms" line) on
// its own line flush right, and under it one footer line spreading the
// rows-per-page field (20/40/60/80, 20 default, a new size restarts at
// page 1) and the "Viser X–Y af Z" summary with the icon-only
// Previous/Next. Renders nothing for an empty list.
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
    <div className="flex flex-1 flex-col gap-y-2 md:gap-y-1">
      {/* The note owns the top line, flush right; the footer line below
          spreads the rows-per-page field and the pager (DESIGN.md
          "Pagination"). */}
      {note ? (
        <p className="text-right text-muted-foreground text-xs">{note}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Field className="w-fit" orientation="horizontal">
          <FieldLabel className="font-normal text-xs" htmlFor={selectId}>
            {copy.rowsPerPage}
          </FieldLabel>
          <Select
            items={sizeItems}
            onValueChange={handleSizeChange}
            value={String(paged.pageSize)}
          >
            <SelectTrigger className="w-16" id={selectId} size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
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
        {/* The summary and the pager, outermost at the right edge. */}
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
