"use client";

// Platform message 1 (#5, Bilag 1 "Afbooking"): the pre-cancel screen. It
// shows the fee as it stands while the page renders; the action recomputes
// it server-side at the exact confirm moment, which is the fee the system
// registers (ADR-0006). A dead link and a non-cancellable booking never
// reach this form — the page refuses them first.
import Link from "next/link";
import { startTransition, useActionState, useCallback } from "react";
import { DetailRow } from "@/components/bookings/detail-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  type CancelByLinkState,
  confirmCancellationByLink,
} from "@/lib/bookings/cancel-actions";
import type { CancellationPreview } from "@/lib/bookings/cancellation";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.cancellation;
const columnCopy = messages.bookings.columns;
const initialState: CancelByLinkState = { status: "idle" };

const terminalMessage = (state: CancelByLinkState): string | null => {
  if (state.status === "success") {
    return copy.success;
  }
  if (state.status === "error" && state.linkInvalid) {
    return state.error;
  }
  return null;
};

function CancellationResultCard({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-lg">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

// Success, invalid-link, retryable-error, and pending states share one form.
// fallow-ignore-next-line complexity
export function CancelConfirmForm({
  bookingId,
  preview,
  token,
}: {
  bookingId: string;
  preview: CancellationPreview;
  token: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmCancellationByLink,
    initialState
  );
  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      startTransition(() => formAction({ bookingId, token }));
    },
    [bookingId, formAction, token]
  );

  const message = terminalMessage(state);
  if (message !== null) {
    return <CancellationResultCard message={message} />;
  }

  return (
    <Card className="w-full max-w-xl">
      <form onSubmit={submit}>
        <CardHeader>
          <CardTitle className="text-lg">{copy.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.status === "error" ? (
            <p className="text-destructive text-sm">{state.error}</p>
          ) : null}
          <dl className="flex flex-col">
            <DetailRow
              label={columnCopy.bookingNumber}
              value={preview.bookingNumber}
            />
            <DetailRow label={columnCopy.room} value={preview.roomName} />
            <DetailRow
              label={messages.bookings.sheet.date}
              value={formatDate(preview.startAt)}
            />
            <DetailRow
              label={messages.bookings.sheet.time}
              value={`${formatTime(preview.startAt)} – ${formatTime(preview.endAt)}`}
            />
          </dl>
          <p className="text-sm tabular-nums">
            {copy.feeLine(formatOre(preview.feeOre))}
          </p>
          <p className="text-muted-foreground text-sm">
            {copy.memberPriceLine(formatOre(preview.memberPriceOre))}
          </p>
          <div className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-sm">
            <p className="mb-1 font-medium text-foreground">
              {copy.rulesTitle}
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {copy.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">{copy.feeNote}</p>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/" />}
            variant="outline"
          >
            {copy.keepBooking}
          </Button>
          <Button disabled={pending} type="submit" variant="destructive">
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending ? copy.confirming : copy.confirm}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
