"use client";

// The booking dialog (DESIGN.md "Booking dialog", #4): large, full-screen
// on phone; header with the room name, a stats band, then the form. "Book
// nu" swaps the body to the verification step (#2); success closes the
// dialog and toasts.
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Hold } from "@/lib/bookings/actions";
import type { SerializedPeriod } from "@/lib/bookings/availability";
import type { BookingViewer } from "@/lib/bookings/viewer";
import { formatKroner } from "@/lib/format";
import type { RoomPrefill } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";
import { BookingForm, type DialogRoom } from "./booking-form";
import { VerificationStep } from "./verification-step";

const copy = messages.booking.dialog;

type Phase = { kind: "form" } | { hold: Hold; kind: "verify" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatsRow({ room }: { room: DialogRoom }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4">
      <Stat
        label={messages.rooms.fields.capacity}
        value={messages.rooms.capacityChip(room.capacity)}
      />
      <Stat
        label={copy.pricePerHour}
        value={`${formatKroner(room.hourlyPriceOre)}${messages.rooms.perHourSuffix}`}
      />
      <Stat label={copy.location} value={room.location ?? "–"} />
    </div>
  );
}

export interface BookingDialogProps {
  initialDate: string;
  initialPeriods: SerializedPeriod[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  prefill: RoomPrefill;
  room: DialogRoom;
  viewer: BookingViewer;
}

export function BookingDialog({
  initialDate,
  initialPeriods,
  onOpenChange,
  open,
  prefill,
  room,
  viewer,
}: BookingDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  // Every close returns the dialog to the form, so the next "Book nu"
  // never reopens on a finished verification step. The trigger opens the
  // dialog directly, which is why the reset sits on close, not on open.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setPhase({ kind: "form" });
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );
  const close = useCallback(() => {
    handleOpenChange(false);
    router.refresh();
  }, [handleOpenChange, router]);
  const handleHeld = useCallback(
    (hold: Hold) => setPhase({ hold, kind: "verify" }),
    []
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{room.name}</DialogTitle>
          <DialogDescription className="sr-only">
            {messages.booking.search.description}
          </DialogDescription>
        </DialogHeader>
        <StatsRow room={room} />
        {phase.kind === "verify" ? (
          <VerificationStep
            hold={phase.hold}
            onConfirmed={close}
            onResent={handleHeld}
          />
        ) : (
          <BookingForm
            initialDate={initialDate}
            initialPeriods={initialPeriods}
            onCreated={close}
            onHeld={handleHeld}
            prefill={prefill}
            room={room}
            viewer={viewer}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
