"use client";

import { XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { CompanySheet } from "@/components/companies/company-sheet";
import { ExportSelectionMenu } from "@/components/export-menu";
import { openRowWith } from "@/components/forms/open-row-with";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { RowTick, useRowSelection } from "@/components/selection/row-selection";
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
import { COMPANY_COLUMNS, NO_VALUE } from "@/lib/companies/admin-columns";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.companies;

// One row's cells: the tick, the contact data and the master-data badge.
// Extracted from the map so the table's own body stays readable — fallow
// counts this arrow among the file's complexity offenders otherwise.
function CompanyRowCells({
  company,
  editing,
  onClose,
  selection,
}: {
  company: CompanyRow;
  editing: boolean;
  onClose: () => void;
  selection: ReturnType<typeof useRowSelection>;
}) {
  return (
    <>
      {/* Sticky sideways with its header cell — horizontally only, a top
          inset would pin the cell while its row scrolls away — on its own
          opaque card ground (the bookings table's status column leads the
          way). */}
      <TableCell className="sticky left-0 z-10 bg-card">
        <RowTick
          checked={selection.selected.has(company.company_id)}
          id={company.company_id}
          label={copy.selection.selectRow(company.company_display_name)}
          toggle={selection.toggle}
        />
      </TableCell>
      <TableCell className="truncate font-medium">
        <CompanySheet company={company} onClose={onClose} open={editing} />
      </TableCell>
      <TableCell className="truncate">{company.company_email}</TableCell>
      <TableCell>
        <Badge variant="outline">
          {copy.membership[company.company_membership_status]}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums">
        {company.company_discount_percent} %
      </TableCell>
      <TableCell className="truncate">
        {company.company_cvr_number ?? NO_VALUE}
      </TableCell>
      <TableCell className="truncate">
        {company.company_contact_name ?? NO_VALUE}
      </TableCell>
      <TableCell className="truncate">
        {company.company_contact_phone ?? NO_VALUE}
      </TableCell>
      <TableCell className="truncate">
        {company.company_invoice_email ?? NO_VALUE}
      </TableCell>
      <TableCell className="text-right">
        {company.company_master_data_completed_at ? (
          <Badge variant="success">{copy.masterDataComplete}</Badge>
        ) : (
          <Badge variant="destructive">{copy.masterDataMissing}</Badge>
        )}
      </TableCell>
    </>
  );
}

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const paged = useTablePagination(companies.length);
  const rows = slicePage(companies, paged.page, paged.pageSize);
  const [editing, setEditing] = useState<CompanyRow | null>(null);

  const openEditor = useCallback(
    (company: CompanyRow) => setEditing(company),
    []
  );
  const closeEditor = useCallback(() => setEditing(null), []);

  const selection = useRowSelection(
    companies.map((company) => company.company_id),
    companies,
    rows,
    (company) => company.company_id
  );
  const selectionCount = selection.selectedEntries.length;

  return (
    <Card
      className="min-w-0 gap-0 overflow-x-auto py-0"
      onMouseDown={selection.stopShiftTextSelect}
    >
      {/* table-fixed: the column widths are stated once in the colgroup
          (col = the widest value seen so far + the 14px cell padding), so
          the swap between the column titles and the bulk actions cannot
          shift the columns, and short-content columns stay as narrow as
          their content. The cols derive from COMPANY_COLUMNS so the widths
          cannot desync from the columns (the bookings table's move). The
          floor is the cols' sum — wider cards keep the table at exactly
          these widths; narrower cards scroll sideways. The truncate cell
          class is the graceful degradation when real data outgrows a
          measured width. Headers keep the primitive's h-10; labels wrap to
          a second line inside it. */}
      <Table
        className="min-w-[77rem] table-fixed [&_thead_th]:whitespace-normal"
        sticky
      >
        <colgroup>
          <col className="w-10" />
          {COMPANY_COLUMNS.map((column) => (
            <col className={column.width} key={column.key} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow>
            {/* Both axes, as the admin tick column: the cell rides the stuck
                header row top and the scroll's left edge, on its own muted
                ground so nothing shows through sideways. */}
            <TableHead className="sticky top-0 left-0 z-10 w-10 bg-muted">
              <Checkbox
                aria-label={copy.selection.selectAll}
                checked={selection.allSelected}
                indeterminate={selection.someSelected && !selection.allSelected}
                onCheckedChange={selection.toggleAll}
              />
            </TableHead>
            {selectionCount > 0 ? (
              // The bulk header: the export stands where the column titles
              // were, and swaps back when the selection clears. The span is
              // COMPANY_COLUMNS.length — the data column count.
              <TableHead colSpan={COMPANY_COLUMNS.length}>
                <div className="flex items-center gap-2">
                  <p className="whitespace-nowrap text-sm">
                    {copy.selection.selected(selectionCount)}
                  </p>
                  <ExportSelectionMenu
                    bodyKey="companyIds"
                    endpoint="/admin/companies/export"
                    fallbackBase="virksomheder"
                    ids={selection.selectedEntries.map(
                      (company) => company.company_id
                    )}
                  />
                  <Button
                    aria-label={copy.selection.clear}
                    onClick={selection.clearSelection}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </div>
              </TableHead>
            ) : (
              COMPANY_COLUMNS.map((column) => (
                <TableHead
                  className={
                    column.align === "right" ? "text-right" : undefined
                  }
                  key={column.key}
                >
                  {column.label}
                </TableHead>
              ))
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((company) => (
            <TableRow
              className="cursor-pointer"
              key={company.company_id}
              tabIndex={0}
              {...openRowWith(company, openEditor)}
            >
              <CompanyRowCells
                company={company}
                editing={editing === company}
                onClose={closeEditor}
                selection={selection}
              />
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
