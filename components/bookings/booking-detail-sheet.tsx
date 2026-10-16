"use client";

// The booking's detail view (#9): what the slimmed table columns used to
// hold — the dates, the company and membership, the invoice date/number
// and the full price panel (the same PriceOverview the calendar's entry
// sheet renders) — one click on the row. The invoice and edit actions stay
// in the row's ⋯ menu; a booking an admin can still cancel also gets the
// destructive "Aflys booking" at the foot. A cancelled booking was never
// served: its basis is the payable fee alone (ADR-0006), which the price
// panel cannot express, so it gets the fee lines instead. Amounts integer
// øre, excl. VAT (ADR-0019, ADR-0020).
import { useCallback } from "react";
import {
  BookingStatusBadge,
  InvoicingStatusBadge,
} from "@/components/bookings/booking-overview";
import { DetailRow } from "@/components/bookings/detail-row";
import { PriceOverview } from "@/components/bookings/price-overview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AdminBookingRow,
  adminRowParts,
  canAdminCancel,
} from "@/lib/domain/admin-bookings";
import { priceOverview } from "@/lib/domain/price-overview";
import {
  formatDate,
  formatDateString,
  formatHours,
  formatOre,
  formatTime,
} from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin;
const bookingsCopy = messages.bookings;
const companiesCopy = messages.companies;

const NONE = "-";

// The badges on one line: the invoicing state and, on a cancelled row,
// the booking state.
function StatusValue({ row }: { row: AdminBookingRow }) {
  return (
    <span className="flex items-center gap-1">
      <InvoicingStatusBadge status={row.invoicingStatus} />
      {row.bookingStatus === "cancelled" ? (
        <BookingStatusBadge status={row.bookingStatus} />
      ) : null}
    </span>
  );
}

// The cancelled booking's money block: the fee (waived = nothing payable)
// is the whole basis (ADR-0006).
function CancelledPrice({ row }: { row: AdminBookingRow }) {
  const parts = adminRowParts(row);
  return (
    <dl className="flex flex-col">
      <DetailRow
        label={bookingsCopy.columns.cancellationFee}
        value={parts.feeOre === 0 ? NONE : formatOre(parts.feeOre)}
      />
      <DetailRow label={copy.columns.total} value={formatOre(parts.basisOre)} />
      <p className="pt-2 text-right text-muted-foreground text-xs">
        {bookingsCopy.allPricesExclVat}
      </p>
    </dl>
  );
}

// The cancel action at the sheet's foot; it opens the confirm dialog.
function CancelButton({
  onCancel,
  row,
}: {
  onCancel: (bookingId: string) => void;
  row: AdminBookingRow;
}) {
  const open = useCallback(
    () => onCancel(row.bookingId),
    [onCancel, row.bookingId]
  );
  if (!canAdminCancel(row, new Date())) {
    return null;
  }
  return (
    <Button onClick={open} type="button" variant="destructive">
      {copy.cancel.action}
    </Button>
  );
}

export function BookingDetailSheet({
  onCancel,
  onOpenChange,
  open,
  row,
}: {
  onCancel: (bookingId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  // The picked booking, kept after close so the exit animation plays over
  // it; null before the first open.
  row: AdminBookingRow | null;
}) {
  if (row === null) {
    return null;
  }
  const parts = adminRowParts(row);
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{row.bookingNumber}</DialogTitle>
          <DialogDescription>{row.companyName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          <dl className="flex flex-col">
            <DetailRow
              label={bookingsCopy.columns.dateTime}
              value={`${formatDate(row.startAt)} · ${formatTime(row.startAt)} - ${formatTime(row.endAt)}`}
            />
            <DetailRow
              label={copy.columns.hours}
              value={parts.minutes === null ? NONE : formatHours(parts.minutes)}
            />
            <DetailRow label={bookingsCopy.columns.room} value={row.roomName} />
            <DetailRow
              label={companiesCopy.columns.status}
              value={companiesCopy.membership[row.membershipStatus]}
            />
            <DetailRow
              label={bookingsCopy.columns.status}
              value={<StatusValue row={row} />}
            />
            {row.bookingStatus === "cancelled" && row.cancelledAt !== null ? (
              <DetailRow
                label={bookingsCopy.sheet.cancelledAt}
                value={`${formatDate(row.cancelledAt)} · ${formatTime(row.cancelledAt)}`}
              />
            ) : null}
            <DetailRow
              label={copy.markInvoiced.date}
              value={
                row.invoiceDate === null
                  ? NONE
                  : formatDateString(row.invoiceDate)
              }
            />
            <DetailRow
              label={copy.markInvoiced.number}
              mono={row.invoiceNumber !== null}
              value={row.invoiceNumber ?? NONE}
            />
          </dl>
          {row.bookingStatus === "cancelled" ? (
            <CancelledPrice row={row} />
          ) : (
            <PriceOverview
              model={priceOverview({
                addOnLines: row.addOns,
                addOnsOre: row.addonTotalOre,
                discountPercent: row.discountPercent,
                manualAmounts: row.manualAmounts,
                roomTotalOre: row.roomPriceOre,
                totalOre: (parts.memberPriceOre ?? 0) + row.addonTotalOre,
              })}
            />
          )}
          <CancelButton onCancel={onCancel} row={row} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
