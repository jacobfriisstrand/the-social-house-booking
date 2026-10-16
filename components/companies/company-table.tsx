"use client";

import { XIcon } from "lucide-react";
// Virksomheder-tabellen (admin): rows are sliced by the URL pagination
// (lib/pagination), the sheet carries the company's information — no
// dedicated page; Mail 10 and a failed first invite point back at this
// list (DESIGN.md: admin edit in a dialog or a sheet). The rows tick for
// the bulk export (#123) with the bookings list's own selection pattern:
// the ticks hold ids, a fresh row set starts over, shift-click adds the
// range from the last tick.
import { type MouseEvent, useCallback, useRef, useState } from "react";
import { CompanySheet } from "@/components/companies/company-sheet";
import { ExportSelectionMenu } from "@/components/export-menu";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { shiftRangeIds } from "@/lib/domain/admin-bookings";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.companies;

// One row's tick: the shift modifier is read in the capture phase on the
// checkbox root itself and consumed by the change it triggers — the
// bookings list's exact wiring (admin-bookings-table.tsx).
function CompanyTick({
  company,
  selected,
  toggle,
}: {
  company: CompanyRow;
  selected: boolean;
  toggle: (companyId: string, shiftKey: boolean) => void;
}) {
  const shiftKey = useRef(false);
  const readShift = useCallback((event: MouseEvent): void => {
    shiftKey.current = event.shiftKey;
  }, []);
  const onToggle = useCallback(() => {
    const shift = shiftKey.current;
    shiftKey.current = false;
    toggle(company.company_id, shift);
  }, [toggle, company.company_id]);
  return (
    <Checkbox
      aria-label={copy.selection.selectRow(company.company_display_name)}
      checked={selected}
      onCheckedChange={onToggle}
      onClickCapture={readShift}
    />
  );
}

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const paged = useTablePagination(companies.length);
  const rows = slicePage(companies, paged.page, paged.pageSize);

  // The selection holds company ids; a fresh row set starts a new
  // selection. The trigger is the id list, not the rows' identity: a
  // re-read of the same companies keeps the ticks. The reset runs at
  // render time when the key changes — React's documented pattern for
  // resetting state on a prop change.
  const rowKey = companies.map((company) => company.company_id).join("\n");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [keyRead, setKeyRead] = useState(rowKey);
  if (rowKey !== keyRead) {
    setKeyRead(rowKey);
    setSelected(new Set());
    setAnchorId(null);
  }

  // toggleAll reaches the whole list, the shift range stays on the page —
  // the bookings list's split.
  const allSelected =
    companies.length > 0 &&
    companies.every((company) => selected.has(company.company_id));
  const someSelected = companies.some((company) =>
    selected.has(company.company_id)
  );
  const selectedEntries = companies.filter((company) =>
    selected.has(company.company_id)
  );

  const toggle = useCallback(
    (companyId: string, shiftKey: boolean): void => {
      const visibleIds = rows.map((company) => company.company_id);
      setSelected((current) => {
        const range = shiftKey
          ? shiftRangeIds(visibleIds, anchorId, companyId)
          : null;
        if (range) {
          return new Set([...current, ...range]);
        }
        const next = new Set(current);
        if (next.has(companyId)) {
          next.delete(companyId);
        } else {
          next.add(companyId);
        }
        return next;
      });
      setAnchorId(companyId);
    },
    [anchorId, rows]
  );
  const toggleAll = useCallback((): void => {
    setSelected(() =>
      allSelected
        ? new Set()
        : new Set(companies.map((company) => company.company_id))
    );
  }, [allSelected, companies]);

  // Shift-click extends the browser's own text selection from the last
  // pressed tick; cancelling that mousedown default keeps the highlight
  // off while the click still toggles the checkbox.
  const stopShiftTextSelect = useCallback((event: MouseEvent): void => {
    if (
      event.shiftKey &&
      event.target instanceof Element &&
      event.target.closest('[data-slot="checkbox"]') !== null
    ) {
      event.preventDefault();
    }
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectionCount = selectedEntries.length;

  return (
    <Card
      className="min-w-0 gap-0 overflow-x-auto py-0"
      onMouseDown={stopShiftTextSelect}
    >
      {/* table-fixed: the columns between the first and the last share the
          remaining width evenly (DESIGN.md "Components"). */}
      <Table className="min-w-[48rem] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-10">
              <Checkbox
                aria-label={copy.selection.selectAll}
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            {selectionCount > 0 ? (
              // The bulk header: the export stands where the column titles
              // were, and swaps back when the selection clears.
              <TableHead colSpan={5}>
                <div className="flex items-center gap-2">
                  <p className="whitespace-nowrap text-sm">
                    {copy.selection.selected(selectionCount)}
                  </p>
                  <ExportSelectionMenu
                    bodyKey="companyIds"
                    endpoint="/admin/companies/export"
                    fallbackBase="virksomheder"
                    ids={selectedEntries.map((company) => company.company_id)}
                  />
                  <Button
                    aria-label={copy.selection.clear}
                    onClick={clearSelection}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </div>
              </TableHead>
            ) : (
              <>
                <TableHead>{copy.columns.displayName}</TableHead>
                <TableHead>{copy.columns.email}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead className="text-right">
                  {copy.columns.discount}
                </TableHead>
                <TableHead className="w-56 max-w-56 text-right">
                  {copy.columns.masterData}
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((company) => (
            <TableRow key={company.company_id}>
              <TableCell>
                <CompanyTick
                  company={company}
                  selected={selected.has(company.company_id)}
                  toggle={toggle}
                />
              </TableCell>
              <TableCell className="truncate font-medium">
                <CompanySheet company={company} />
              </TableCell>
              <TableCell className="truncate">
                {company.company_email}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {copy.membership[company.company_membership_status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {company.company_discount_percent} %
              </TableCell>
              <TableCell className="text-right">
                {company.company_master_data_completed_at ? (
                  <Badge variant="success">{copy.masterDataComplete}</Badge>
                ) : (
                  <Badge variant="destructive">{copy.masterDataMissing}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardFooter className="px-2 py-1">
        <TablePagination paged={paged} totalItems={companies.length} />
      </CardFooter>
    </Card>
  );
}
