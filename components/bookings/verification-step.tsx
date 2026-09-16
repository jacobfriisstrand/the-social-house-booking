"use client";

// The verification step of the booking dialog (DESIGN.md "Booking dialog",
// #2): a sentence naming the booker's email, the six-digit code input, the
// hold countdown, "Send ny kode" and "Bekræft booking". #4 mounts it in the
// dialog once "Book nu" has created the hold; until then the development
// page under app/(public)/demo/booking does.
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState, useTransition } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { type Hold, resendCode, verifyCode } from "@/lib/bookings/actions";
import { VERIFICATION_CODE_LENGTH } from "@/lib/domain/verification";
import {
  type VerifyCodeValues,
  verifyCodeSchema,
} from "@/lib/validation/booking";
import { messages } from "@/messages/da";

const copy = messages.booking.verification;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

// Seconds left on the hold, ticking once a second. Starts from the real
// clock on mount, so a hold that expired while the tab was hidden shows 0
// immediately.
function useSecondsLeft(expiresAt: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MS_PER_SECOND);
    return () => clearInterval(timer);
  }, []);
  const left = Math.floor(
    (new Date(expiresAt).getTime() - now) / MS_PER_SECOND
  );
  return Math.max(0, left);
}

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = seconds % SECONDS_PER_MINUTE;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

// "Send ny kode": the action result either replaces the hold (new expiry)
// or toasts.
function useResendCode(
  hold: Hold,
  form: UseFormReturn<VerifyCodeValues>,
  onResent: (hold: Hold) => void
): [boolean, () => void] {
  const [resending, startResend] = useTransition();
  const handleResend = useCallback(() => {
    startResend(async () => {
      const result = await resendCode(hold.bookingId);
      if (result.status === "held") {
        form.resetField("code");
        toast.add({ title: copy.codeSent, type: "success" });
        onResent(result.hold);
        return;
      }
      if (result.status === "error") {
        toast.add({ title: result.error, type: "error" });
      }
    });
  }, [form, hold.bookingId, onResent]);
  return [resending, handleResend];
}

function HoldCountdown({ secondsLeft }: { secondsLeft: number }) {
  return (
    <p className="text-muted-foreground text-sm">
      {secondsLeft === 0
        ? copy.expired
        : copy.countdown(formatCountdown(secondsLeft))}
    </p>
  );
}

interface VerificationStepProps {
  hold: Hold;
  onConfirmed: () => void;
  onResent: (hold: Hold) => void;
}

export function VerificationStep({
  hold,
  onConfirmed,
  onResent,
}: VerificationStepProps) {
  const form = useForm<VerifyCodeValues>({
    defaultValues: { bookingId: hold.bookingId, code: "" },
    resolver: zodResolver(verifyCodeSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: verifyCode,
    form,
    successMessage: messages.booking.confirmed,
  });
  const secondsLeft = useSecondsLeft(hold.holdExpiresAt);
  const [resending, handleResend] = useResendCode(hold, form, onResent);

  useEffect(() => {
    if (state.status === "success") {
      onConfirmed();
    }
  }, [state.status, onConfirmed]);

  const expired = secondsLeft === 0;
  const disabled = pending || resending || expired;

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <h2 className="font-medium text-lg">{copy.title}</h2>
        <p>{copy.sentTo(hold.bookerEmail)}</p>
      </div>
      <FieldGroup>
        <TextField
          autoComplete="one-time-code"
          className="text-center font-mono text-2xl tracking-[0.5em]"
          control={form.control}
          disabled={expired}
          inputMode="numeric"
          label={messages.booking.fields.code}
          maxLength={VERIFICATION_CODE_LENGTH}
          name="code"
        />
      </FieldGroup>
      <HoldCountdown secondsLeft={secondsLeft} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <PendingButton
          disabled={disabled}
          idleLabel={copy.resend}
          onClick={handleResend}
          pending={resending}
          pendingLabel={copy.resending}
          type="button"
          variant="outline"
        />
        <PendingButton
          disabled={disabled}
          idleLabel={copy.confirm}
          pending={pending}
          pendingLabel={copy.confirming}
          type="submit"
        />
      </div>
    </form>
  );
}
