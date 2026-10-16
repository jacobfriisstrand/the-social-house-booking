"use client";

// The invoice read-back the company sees (#122): the number Franz enters
// when invoicing, shown only while the booking is invoiced — leaving
// invoiced clears both columns (the lifecycle trigger,
// migration 20261006081139). The booking sheet and the confirmed page
// share the rows.
import { DetailRow } from "@/components/bookings/detail-row";
import { formatDate } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings.sheet;

export function InvoiceDetailRows({
  invoiceDate,
  invoiceNumber,
  invoiced,
}: {
  invoiceDate: string | null;
  invoiceNumber: string | null;
  invoiced: boolean;
}) {
  if (invoiced && invoiceNumber !== null) {
    return (
      <>
        <DetailRow label={copy.invoiceNumber} mono value={invoiceNumber} />
        {invoiceDate === null ? null : (
          <DetailRow label={copy.invoiceDate} value={formatDate(invoiceDate)} />
        )}
      </>
    );
  }
  return null;
}
