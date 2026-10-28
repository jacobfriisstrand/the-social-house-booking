// The companies table's exports (#123): the same columns the admin
// Virksomheder table shows, rendered from the one shared definition
// (COMPANY_COLUMNS in lib/companies/admin-columns.ts) the table renders
// from too — the bookings table's seam, after #113's master-data columns
// once grew the table and left this export behind. One ExportTable feeds
// both formats: the CSV (Excel/Numbers) and the PDF.
import { COMPANY_COLUMNS } from "@/lib/companies/admin-columns";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import type { ExportTable } from "@/lib/export/table";

/** The companies table both formats render: the header row, one row per company. */
export function companiesTable(rows: readonly CompanyRow[]): ExportTable {
  return {
    headers: COMPANY_COLUMNS.map((column) => column.csvHeader),
    rows: rows.map((row) =>
      COMPANY_COLUMNS.map((column) => column.csvCell(row))
    ),
  };
}
