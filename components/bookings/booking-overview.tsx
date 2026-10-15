"use client";

// The booking and invoicing status badges, shared by the member Bookinger
// table (member-bookings-view.tsx), the admin Bookinger table and the
// admin detail sheet.
import { Badge } from "@/components/ui/badge";
import type {
  BookingInvoicingStatus,
  BookingOverviewStatus,
} from "@/lib/domain/booking-overview";
import { messages } from "@/messages/da";

const copy = messages.bookings;

// The booking status badge, shared with the admin Bookinger table.
export function BookingStatusBadge({
  status,
}: {
  status: BookingOverviewStatus;
}) {
  if (status === "cancelled") {
    return <Badge variant="destructive">{copy.status.cancelled}</Badge>;
  }
  if (status === "pending_verification") {
    return <Badge variant="warning">{copy.status.pendingVerification}</Badge>;
  }
  return <Badge variant="success">{copy.status.confirmed}</Badge>;
}

// The invoicing status badge, shared with the admin Bookinger table.
export function InvoicingStatusBadge({
  status,
}: {
  status: BookingInvoicingStatus;
}) {
  if (status === "invoiced") {
    return <Badge variant="success">{copy.invoicing.invoiced}</Badge>;
  }
  if (status === "not_invoicable") {
    return (
      <Badge className="bg-muted text-muted-foreground" variant="outline">
        {copy.invoicing.notInvoicable}
      </Badge>
    );
  }
  return <Badge variant="warning">{copy.invoicing.notInvoiced}</Badge>;
}
