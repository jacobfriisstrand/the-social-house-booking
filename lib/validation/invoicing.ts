import { z } from "zod";
import { messages } from "@/messages/da";

// The bulk "Markér som faktureret" dialog (#9): the bookings the admin
// selected, the invoice date from e-conomic, and the invoice numbers — one
// per company (a Rituals batch and a Nordic Events batch become two
// fields, one per company), or one per booking when the admin unticks the
// company mode. The who/when are recorded by the database trigger
// (schemas/bookings.sql), so the form only carries what the admin knows.
// The action groups the rows by number and writes one update per distinct
// number.

const { errors } = messages.bookings.admin.markInvoiced;

const numberField = z
  .string()
  .trim()
  .min(1, errors.numberRequired)
  .max(40, errors.numberRequired);

export const markInvoicedSchema = z
  .object({
    bookingCompanies: z.record(z.string(), z.string()),
    bookingIds: z.array(z.guid()).min(1, errors.failed),
    // The form's mode switch: company mode shows one field per company.
    companyMode: z.boolean(),
    // Company mode: one number per company id, plus the company each
    // booking belongs to (set from the selection at reset).
    companyNumbers: z.record(z.string(), z.string().optional()),
    // z.iso.date, not z.guid: an invoice date is a calendar date.
    invoiceDate: z.iso.date({ message: errors.dateRequired }),
    // Per-booking mode: one number per booking id.
    invoiceNumbers: z.record(z.string(), z.string().optional()),
  })
  .superRefine((values, ctx) => {
    // One issue per field the admin left empty, not one per selection: a
    // break here flags the first field and leaves its siblings silent, and
    // in company mode several bookings share one company id.
    const flagged = new Set<string>();
    for (const id of values.bookingIds) {
      const companyId = values.bookingCompanies[id] ?? "";
      const path = values.companyMode
        ? ["companyNumbers", companyId]
        : ["invoiceNumbers", id];
      const key = path.join(".");
      if (flagged.has(key)) {
        continue;
      }
      const number = values.companyMode
        ? (values.companyNumbers[companyId] ?? "")
        : (values.invoiceNumbers[id] ?? "");
      if (!numberField.safeParse(number).success) {
        flagged.add(key);
        ctx.addIssue({ code: "custom", message: errors.numberRequired, path });
      }
    }
  });

export type MarkInvoicedValues = z.infer<typeof markInvoicedSchema>;

/** The resolved number per booking id, after the mode fills in. */
export function resolvedInvoiceNumbers(
  values: MarkInvoicedValues
): Map<string, string> {
  return new Map(
    values.bookingIds.map((id) => [
      id,
      values.companyMode
        ? (
            values.companyNumbers[values.bookingCompanies[id] ?? ""] ?? ""
          ).trim()
        : (values.invoiceNumbers[id] ?? "").trim(),
    ])
  );
}
