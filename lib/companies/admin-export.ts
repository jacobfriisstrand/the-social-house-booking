// The companies table's exports (#123): the same columns the admin
// Virksomheder table shows (the header row in
// components/companies/company-table.tsx — keep the two in sync; #113's
// extra master-data columns grow both when it lands). One ExportTable
// feeds both formats. The discount is a bare integer so the column stays
// numeric; the (%) unit lives in the header, like the table's cell suffix.
import type { CompanyRow } from "@/lib/domain/company-master-data";
import type { ExportCell, ExportTable } from "@/lib/export/table";
import { messages } from "@/messages/da";

const copy = messages.companies;

function companyCells(row: CompanyRow): ExportCell[] {
  return [
    row.company_display_name,
    row.company_email,
    copy.membership[row.company_membership_status],
    row.company_discount_percent,
    row.company_master_data_completed_at
      ? copy.masterDataComplete
      : copy.masterDataMissing,
  ];
}

/** The companies table both formats render: the header row, one row per company. */
export function companiesTable(rows: readonly CompanyRow[]): ExportTable {
  return {
    headers: [
      copy.columns.displayName,
      copy.columns.email,
      copy.columns.status,
      `${copy.columns.discount} (%)`,
      copy.columns.masterData,
    ],
    rows: rows.map(companyCells),
  };
}
