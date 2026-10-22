"use client";

// "Aflys booking" for an admin (#5, Bilag 1 "Afbooking"): the company's
// booking cancelled on its behalf with the same fee and mails as its own
// cancellation. The fee shown is read when the dialog opens; the action
// recomputes it at the confirm moment.
import { useCallback, useState } from "react";
import { CancelConfirmDialog } from "@/components/bookings/cancel-confirm-dialog";
import { CancellationSummary } from "@/components/bookings/cancellation-summary";
import { cancelBookingAsAdmin } from "@/lib/bookings/admin-cancel-actions";
import {
  type AdminBookingRow,
  cancellationPolicyOfRow,
} from "@/lib/domain/admin-bookings";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.cancel;

// The fee the dialog states, read when it opens: the one policy answers
// both whether the booking can cancel and what fee the screen shows
// (#155); the action recomputes it at the confirm moment. The dialog only
// opens on a row the canAdminCancel guard has admitted, so a refusal
// reads as no fee.
const liveFeeOre = (row: AdminBookingRow): number => {
  const policy = cancellationPolicyOfRow(row, new Date());
  return policy.mayCancel ? policy.feeOre : 0;
};

export function AdminCancelDialog({
  onClose,
  row,
}: {
  onClose: () => void;
  row: AdminBookingRow;
}) {
  const [feeOre] = useState(() => liveFeeOre(row));
  const cancel = useCallback(
    () => cancelBookingAsAdmin(row.bookingId),
    [row.bookingId]
  );
  return (
    <CancelConfirmDialog
      cancel={cancel}
      onClose={onClose}
      title={copy.title(row.roomName, row.companyName)}
    >
      <CancellationSummary
        bookingNumber={row.bookingNumber}
        endAt={row.endAt}
        feeIntro={copy.feeIntro}
        feeOre={feeOre}
        note={copy.mailNote}
        startAt={row.startAt}
      />
    </CancelConfirmDialog>
  );
}
