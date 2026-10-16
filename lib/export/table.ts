// The admin exports' shared table (#123): the columns both formats carry,
// built once per table by the domain builders (lib/bookings/admin-export,
// lib/companies/admin-export) so the CSV and the PDF cannot drift apart.
export type ExportCell = string | number | null;

export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}
