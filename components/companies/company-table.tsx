"use client";

import { CompanySheet } from "@/components/companies/company-sheet";
// Virksomheder-tabellen (admin): rows are sliced by the URL pagination
// (lib/pagination), the sheet carries the company's information — no
// dedicated page; Mail 10 and a failed first invite point back at this
// list (DESIGN.md: admin edit in a dialog or a sheet).
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter } from "@/components/ui/card";
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

  return (
    <Card className="min-w-0 gap-0 overflow-x-auto py-0">
      {/* table-fixed: column widths come from the header row only, so
          row content can never resize a column and the layout does not
          jump as data changes. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[26%]">
              {copy.columns.displayName}
            </TableHead>
            <TableHead className="w-[26%]">{copy.columns.email}</TableHead>
            <TableHead className="w-32">{copy.columns.status}</TableHead>
            <TableHead className="w-24 text-right">
              {copy.columns.discount}
            </TableHead>
            <TableHead className="w-56 max-w-56 text-right">
              {copy.columns.masterData}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((company) => (
            <TableRow key={company.company_id}>
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
