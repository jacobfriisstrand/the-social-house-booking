"use client";

import { XIcon } from "lucide-react";
import { CompanySheet } from "@/components/companies/company-sheet";
import { ExportSelectionMenu } from "@/components/export-menu";
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
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.companies;

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const paged = useTablePagination(companies.length);
  const rows = slicePage(companies, paged.page, paged.pageSize);

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
      {/* table-fixed: the columns between the first and the last share the
          remaining width evenly (DESIGN.md "Components"). */}
      <Table className="min-w-[48rem] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-10">
              <Checkbox
                aria-label={copy.selection.selectAll}
                checked={selection.allSelected}
                indeterminate={selection.someSelected && !selection.allSelected}
                onCheckedChange={selection.toggleAll}
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
                <RowTick
                  checked={selection.selected.has(company.company_id)}
                  id={company.company_id}
                  label={copy.selection.selectRow(company.company_display_name)}
                  toggle={selection.toggle}
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
