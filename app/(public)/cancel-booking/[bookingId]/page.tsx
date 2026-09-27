// The secure cancellation link's destination (#5, Bilag 1 "Afbooking"):
// Platform message 1. No session — the mail link is the credential, checked
// with the timing-safe HMAC in lib/domain/cancel-link.ts before anything is
// read. The booking is read through the service-role client (allowlist
// entry 2 in docs/agents/supabase.md); a dead link, an unknown id and
// another booking's token all read as the same invalid-link screen.
import type { ReactNode } from "react";
import { z } from "zod";
import { CancelConfirmForm } from "@/components/bookings/cancel-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancellationPreviewOf,
  loadBookingForCancellation,
  refusalMessage,
  refuseCancellation,
} from "@/lib/bookings/cancellation";
import { cancellationLinkIsValid } from "@/lib/domain/cancel-link";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { messages } from "@/messages/da";

const copy = messages.cancellation;
const bookingIdSchema = z.guid();

type CancellationPageState =
  | { kind: "dead"; message: string }
  | {
      bookingId: string;
      kind: "confirm";
      preview: ReturnType<typeof cancellationPreviewOf>;
      token: string;
    };

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </main>
  );
}

// Keep each bearer-link and booking-state refusal explicit before rendering
// any booking details.
// fallow-ignore-next-line complexity
async function cancellationPageState(
  rawBookingId: string,
  token: string
): Promise<CancellationPageState> {
  const parsed = bookingIdSchema.safeParse(rawBookingId);
  if (!parsed.success) {
    return { kind: "dead", message: copy.invalidLink };
  }
  if (!cancellationLinkIsValid(env.BOOKING_CANCEL_SECRET, parsed.data, token)) {
    return { kind: "dead", message: copy.invalidLink };
  }

  const booking = await loadBookingForCancellation(
    createAdminClient(),
    parsed.data
  );
  if (!booking) {
    return {
      kind: "dead",
      message: refusalMessage("not_cancellable"),
    };
  }

  const now = new Date();
  const refusal = refuseCancellation(booking, now);
  if (refusal) {
    return { kind: "dead", message: refusalMessage(refusal) };
  }

  return {
    bookingId: parsed.data,
    kind: "confirm",
    preview: cancellationPreviewOf(booking, now),
    token,
  };
}

// One message for every way the link is dead: a malformed id, a wrong or
// missing token, an unknown booking, or a booking that is not live. The
// screen never discloses which one it was.
function DeadLink({ message }: { message: string }) {
  return (
    <Screen>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{message}</p>
        </CardContent>
      </Card>
    </Screen>
  );
}

export default async function CancelBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ bookingId }, { token = "" }] = await Promise.all([
    params,
    searchParams,
  ]);
  const state = await cancellationPageState(bookingId, token);
  if (state.kind === "dead") {
    return <DeadLink message={state.message} />;
  }

  return (
    <Screen>
      <CancelConfirmForm
        bookingId={state.bookingId}
        preview={state.preview}
        token={state.token}
      />
    </Screen>
  );
}
