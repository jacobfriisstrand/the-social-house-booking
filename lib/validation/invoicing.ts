import { z } from "zod";
import { messages } from "@/messages/da";

// The bulk "Markér som faktureret" dialog (#9): the bookings the admin
// selected, the invoice date from e-conomic, and the invoice number. The
// who/when are recorded by the database trigger (schemas/bookings.sql), so
// the form only carries what the admin knows.

const { errors } = messages.bookings.admin.markInvoiced;

export const markInvoicedSchema = z.object({
  bookingIds: z.array(z.guid()).min(1, errors.failed),
  // z.iso.date, not z.guid: an invoice date is a calendar date.
  invoiceDate: z.iso.date({ message: errors.dateRequired }),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, errors.numberRequired)
    .max(40, errors.numberRequired),
});

export type MarkInvoicedValues = z.infer<typeof markInvoicedSchema>;
