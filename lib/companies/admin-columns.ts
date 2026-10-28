// The admin Virksomheder table's columns: one definition — header label,
// CSV cell — that both the table (components/companies/company-table.tsx)
// and the export (lib/companies/admin-export.ts) render from, so the two
// cannot drift. The bookings table's ADMIN_COLUMNS (lib/bookings/
// admin-columns.ts) leads the way; #113's master-data columns once grew
// the table and left the export behind, which is the drift this seam
// exists to prevent. The row's own cells keep their bespoke markup (the
// sheet link, the badges); each column's csvCell is the plain value
// behind that markup — the badges' labels, the em dash where the table
// shows one. The discount is a bare integer so the column stays numeric;
// the (%) unit lives in the header, like the table's cell suffix.
import type { CompanyRow } from "@/lib/domain/company-master-data";
import type { ExportCell } from "@/lib/export/table";
import { messages } from "@/messages/da";

const copy = messages.companies;

// The no-value placeholder both the table's cells and the exports carry:
// a blank cell reads as "forgotten to render", a dash as "no data".
export const NO_VALUE = "—";

export type CompanyColumnKey =
  | "contactName"
  | "contactPhone"
  | "cvrNumber"
  | "discount"
  | "displayName"
  | "email"
  | "invoiceEmail"
  | "masterData"
  | "status";

export interface CompanyColumn {
  // Right-aligned columns (DESIGN.md "Components": every data table's
  // last column sits right-aligned).
  align?: "right";
  // The CSV/PDF cell — the plain value the table's cell shows.
  csvCell: (row: CompanyRow) => ExportCell;
  // The CSV/PDF header — the table's label, with a unit where the cell
  // carries one ("Rabat (%)").
  csvHeader: string;
  key: CompanyColumnKey;
  // The table's header.
  label: string;
  // Explicit width in the table-fixed table's colgroup; the rest share
  // what remains.
  width: string;
}

/** The admin Virksomheder table's columns, in the order the table and
 * the exports both render. */
export const COMPANY_COLUMNS: readonly CompanyColumn[] = [
  {
    csvCell: (row) => row.company_display_name,
    csvHeader: copy.columns.displayName,
    key: "displayName",
    label: copy.columns.displayName,
    width: "w-[137px]",
  },
  {
    csvCell: (row) => row.company_email,
    csvHeader: copy.columns.email,
    key: "email",
    label: copy.columns.email,
    width: "w-[187px]",
  },
  {
    csvCell: (row) => copy.membership[row.company_membership_status],
    csvHeader: copy.columns.status,
    key: "status",
    label: copy.columns.status,
    width: "w-[112px]",
  },
  {
    csvCell: (row) => row.company_discount_percent,
    csvHeader: `${copy.columns.discount} (%)`,
    key: "discount",
    label: copy.columns.discount,
    width: "w-16",
  },
  {
    csvCell: (row) => row.company_cvr_number ?? NO_VALUE,
    csvHeader: copy.columns.cvrNumber,
    key: "cvrNumber",
    label: copy.columns.cvrNumber,
    width: "w-[80px]",
  },
  {
    csvCell: (row) => row.company_contact_name ?? NO_VALUE,
    csvHeader: copy.columns.contactName,
    key: "contactName",
    label: copy.columns.contactName,
    width: "w-[114px]",
  },
  {
    csvCell: (row) => row.company_contact_phone ?? NO_VALUE,
    csvHeader: copy.columns.contactPhone,
    key: "contactPhone",
    label: copy.columns.contactPhone,
    width: "w-[109px]",
  },
  {
    csvCell: (row) => row.company_invoice_email ?? NO_VALUE,
    csvHeader: copy.columns.invoiceEmail,
    key: "invoiceEmail",
    label: copy.columns.invoiceEmail,
    width: "w-[196px]",
  },
  {
    align: "right",
    csvCell: (row) =>
      row.company_master_data_completed_at
        ? copy.masterDataComplete
        : copy.masterDataMissing,
    csvHeader: copy.columns.masterData,
    key: "masterData",
    label: copy.columns.masterData,
    width: "w-56",
  },
];
