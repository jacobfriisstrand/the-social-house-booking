// The admin Bookinger table's columns (#157): one definition — header
// label, sort key, CSV cells — that both the table
// (components/bookings/admin-bookings-table.tsx) and the export
// (lib/bookings/admin-export.ts) render from, so the two cannot drift:
// the table's header row, colgroup and skeleton row map the list, and
// each column's csvCells are the export's row accessor. The CSV
// flattens each column to 1+ cells: the status column writes the
// invoicing label and the cancelled badge's own Ja column, the date
// column writes the two readable datetimes.
// Amounts are integer øre (ADR-0019) exported as kroner with comma
// decimals, still excl. VAT (ADR-0020); the " kr" unit stays out of the
// cells so Excel can sum the column. The table's "-" placeholder carries
// over.
import type {
  AdminBookingRow,
  AdminSortKey,
} from "@/lib/domain/admin-bookings";
import { adminRowTotalOre } from "@/lib/domain/admin-bookings";
import { formatDateTime, formatKronerDecimal } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings;
const adminCopy = copy.admin;

// The invoicing status's label — the same string the table's badge
// shows, written into the CSV's Status cell.
const invoicingStatusLabel: Record<AdminBookingRow["invoicingStatus"], string> =
  {
    invoiced: copy.invoicing.invoiced,
    not_invoicable: copy.invoicing.notInvoicable,
    not_invoiced: copy.invoicing.notInvoiced,
  };

const NONE = "-";

// "-" when the table would show NONE (a waived fee, a zero basis).
const oreCell = (ore: number | null): string =>
  ore === null ? NONE : formatKronerDecimal(ore);

export interface AdminColumn {
  // Right-aligned money columns (DESIGN.md "Components").
  align?: "right";
  // The CSV cells for one row, as many as csvHeaders, in order.
  csvCells: (row: AdminBookingRow) => string[];
  // The CSV header strings — a table column that splits across several
  // CSV cells (status → Status + Aflyst, the date → Start + Slut) carries
  // two.
  csvHeaders: string[];
  key: AdminSortKey;
  // The table's header.
  label: string;
  // Explicit width in the table-fixed table; the rest share what remains.
  width?: string;
}

/** The admin Bookinger table's columns, in the order the table and the
 * CSV both render. */
export const ADMIN_COLUMNS: readonly AdminColumn[] = [
  {
    csvCells: (row) => [
      invoicingStatusLabel[row.invoicingStatus],
      row.bookingStatus === "cancelled" ? messages.common.yes : NONE,
    ],
    csvHeaders: [copy.columns.status, copy.status.cancelled],
    key: "status",
    label: copy.columns.status,
    width: "w-36",
  },
  {
    csvCells: (row) => [row.bookingNumber],
    csvHeaders: [copy.columns.bookingNumber],
    key: "bookingNumber",
    label: copy.columns.bookingNumber,
  },
  {
    csvCells: (row) => [row.companyName],
    csvHeaders: [adminCopy.columns.company],
    key: "company",
    label: adminCopy.columns.company,
  },
  {
    csvCells: (row) => [row.roomName],
    csvHeaders: [copy.columns.room],
    key: "room",
    label: copy.columns.room,
  },
  {
    csvCells: (row) => [formatDateTime(row.startAt), formatDateTime(row.endAt)],
    csvHeaders: [copy.columns.start, copy.columns.end],
    key: "date",
    label: copy.columns.dateTime,
  },
  {
    csvCells: (row) => [String(row.participants)],
    csvHeaders: [copy.columns.participants],
    key: "participants",
    label: copy.columns.participants,
  },
  {
    csvCells: (row) => [
      row.addOns.length === 0 ? NONE : copy.columns.addOnsYes,
    ],
    csvHeaders: [copy.columns.addOns],
    key: "addOns",
    label: copy.columns.addOns,
  },
  {
    align: "right",
    csvCells: (row) => [oreCell(adminRowTotalOre(row))],
    csvHeaders: [adminCopy.columns.totalPrice],
    key: "memberPrice",
    label: adminCopy.columns.totalPrice,
  },
];
