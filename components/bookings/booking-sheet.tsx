"use client";

// The booking sheet on the member overview (DESIGN.md "Bookinger (member)"):
// a row click opens the booking's details, and a confirmed upcoming booking
// carries the destructive "Aflys booking" flow — the confirm dialog states
// the fee in one sentence (Platform message 1's in-app twin), and the action
// recomputes it server-side at the exact confirm moment (#5, ADR-0006).
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { DetailRow } from "@/components/bookings/detail-row";
import { PriceOverview } from "@/components/bookings/price-overview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cancelOwnBooking } from "@/lib/bookings/cancel-actions";
import type { BookingOverviewRow } from "@/lib/domain/booking-overview";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings.sheet;

// The confirm dialog (DESIGN.md "Confirm before destroying"): the
// consequence in one sentence — the fee, if any, stated in it — a secondary
// "Fortryd" and a destructive confirm. It mounts only while confirming, so
// a refresh or an error cannot leave a dead dialog open behind the sheet.
// The fee explanation and the final destructive action stay in one dialog.
// fallow-ignore-next-line complexity
function CancelConfirmDialog({
  booking,
  onClose,
}: {
  booking: BookingOverviewRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The dialog only closes; opening happens where the button mounts it.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const confirm = useCallback(() => {
    startTransition(async () => {
      const result = await cancelOwnBooking(booking.bookingId);
      if (result.status === "cancelled") {
        toast.add({
          title:
            result.feeOre > 0
              ? copy.successWithFee(formatOre(result.feeOre))
              : copy.successWithoutFee,
          type: "success",
        });
      } else {
        // The slot may have slipped past while the sheet was open; the row's
        // status is re-read on refresh either way.
        toast.add({ title: result.error, type: "error" });
      }
      router.refresh();
      onClose();
    });
  }, [booking.bookingId, onClose, router]);

  const fee = booking.liveCancellationFeeOre ?? 0;
  const sentence =
    fee > 0 ? copy.confirmSentence(formatOre(fee)) : copy.confirmSentenceFree;

  return (
    <Dialog onOpenChange={handleOpenChange} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.cancel}</DialogTitle>
          <DialogDescription>{sentence}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            {copy.keep}
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending ? copy.cancelling : copy.confirmCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancellationRules() {
  return (
    <div className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-sm">
      <p className="mb-1 font-medium text-foreground">{copy.termsTitle}</p>
      <ul className="list-disc space-y-1 pl-4">
        {messages.cancellation.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}

// Booking status controls both the cancellation rules and the cancel action.
// fallow-ignore-next-line complexity
function BookingSheetDetails({
  booking,
  onCancel,
}: {
  booking: BookingOverviewRow;
  onCancel: () => void;
}) {
  const canCancel =
    booking.bookingStatus === "confirmed" &&
    booking.liveCancellationFeeOre !== null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription className="font-mono">
          {booking.bookingNumber}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-6 px-4 pb-8">
        <dl className="flex flex-col">
          <DetailRow
            label={messages.bookings.columns.room}
            value={booking.roomName}
          />
          <DetailRow
            label={messages.bookings.sheet.date}
            value={formatDate(booking.bookingStartAt)}
          />
          <DetailRow
            label={messages.bookings.sheet.time}
            value={`${formatTime(booking.bookingStartAt)} – ${formatTime(booking.endAt)}`}
          />
          <DetailRow
            label={messages.bookings.columns.booker}
            value={booking.bookerName}
          />
          <DetailRow
            label={messages.bookings.columns.cancellationFee}
            value={
              booking.cancellationFeeOre === null
                ? messages.bookings.noCancellationFee
                : formatOre(booking.cancellationFeeOre)
            }
          />
        </dl>
        <PriceOverview model={booking.price} />
        {booking.bookingStatus === "confirmed" ? <CancellationRules /> : null}
        {canCancel ? (
          <Button onClick={onCancel} type="button" variant="destructive">
            {copy.cancel}
          </Button>
        ) : null}
      </div>
    </>
  );
}

// The sheet: the booking's details, the frozen price overview (ADR-0005),
// the cancellation rules, and — for a confirmed upcoming booking — the
// destructive cancel flow. A cancelled booking shows its fee instead.
export function BookingSheet({
  booking,
  onClose,
  open,
}: {
  booking: BookingOverviewRow | null;
  onClose: () => void;
  open: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const closeSheet = useCallback(() => {
    setConfirming(false);
    onClose();
  }, [onClose]);
  const handleSheetOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        closeSheet();
      }
    },
    [closeSheet]
  );
  const openConfirm = useCallback(() => setConfirming(true), []);

  if (!booking) {
    return null;
  }

  return (
    <>
      <Sheet onOpenChange={handleSheetOpenChange} open={open}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          <BookingSheetDetails booking={booking} onCancel={openConfirm} />
        </SheetContent>
      </Sheet>
      {confirming ? (
        <CancelConfirmDialog booking={booking} onClose={closeSheet} />
      ) : null}
    </>
  );
}
