"use client";

// The booking dialog (DESIGN.md "Booking dialog", #4, #81): one height from
// md up, full-screen on phone. The room name, the step row, then the
// current step with its navigation pinned under it. "Book nu" on the
// overview step creates the hold and swaps the body to the verification
// step (#2); success closes the dialog, toasts, and goes to the
// booking-complete page.
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
import type { RoomPrefill } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";
import { BookingForm, type DialogRoom, FORM_STEP_COUNT } from "./booking-form";
import { BookingSteps } from "./booking-steps";
import { VerificationStep } from "./verification-step";

type Phase = { kind: "form" } | { hold: Hold; kind: "verify" };

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
  const [step, setStep] = useState(0);
  // Every close returns the dialog to the first step of the form, so the
  // next "Book nu" never reopens mid-flow or on a finished verification
  // step. The trigger opens the dialog directly, which is why the reset
  // sits on close, not on open.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setPhase({ kind: "form" });
        setStep(0);
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );
  const complete = useCallback(
    (bookingId: string) => {
      handleOpenChange(false);
      router.push(`/bookings/${bookingId}/confirmed`);
    },
    [handleOpenChange, router]
  );
  const handleHeld = useCallback(
    (hold: Hold) => setPhase({ hold, kind: "verify" }),
    []
  );
  const heldBookingId = phase.kind === "verify" ? phase.hold.bookingId : null;
  const handleConfirmed = useCallback(() => {
    if (heldBookingId) {
      complete(heldBookingId);
    }
  }, [complete, heldBookingId]);
  const current = phase.kind === "verify" ? FORM_STEP_COUNT : step;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {/* A large dialog: a slower fade with a slight rise reads smoother
          than the default quick zoom, opening and closing. The height is
          fixed from md up so the dialog keeps its size between steps, and
          every step fits inside it: only the start-time list scrolls. */}
      <DialogContent className="data-closed:slide-out-to-bottom-4 data-open:slide-in-from-bottom-4 flex flex-col p-6 duration-300 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-3xl md:h-[min(40rem,calc(100dvh-2rem))]">
        <DialogHeader>
          <DialogTitle className="text-xl">{room.name}</DialogTitle>
          <DialogDescription className="sr-only">
            {messages.booking.search.description}
          </DialogDescription>
        </DialogHeader>
        <BookingSteps current={current} verifies={viewer.kind === "company"} />
        {phase.kind === "verify" ? (
          <VerificationStep
            hold={phase.hold}
            onConfirmed={handleConfirmed}
            onResent={handleHeld}
          />
        ) : (
          <BookingForm
            initialDate={initialDate}
            initialPeriods={initialPeriods}
            onCreated={complete}
            onHeld={handleHeld}
            onStepChange={setStep}
            prefill={prefill}
            room={room}
            step={step}
            viewer={viewer}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
