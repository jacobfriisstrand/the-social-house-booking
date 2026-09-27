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

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </main>
  );
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
  const { bookingId } = await params;
  const { token = "" } = await searchParams;
  const parsed = bookingIdSchema.safeParse(bookingId);
  const linkIsDead = !(
    parsed.success &&
    cancellationLinkIsValid(env.BOOKING_CANCEL_SECRET, parsed.data, token)
  );
  if (linkIsDead) {
    return <DeadLink message={copy.invalidLink} />;
  }

  const booking = await loadBookingForCancellation(
    createAdminClient(),
    parsed.data
  );
  const now = new Date();
  // A valid token for a booking that is gone or not live reads as a
  // refusal, so the screen never discloses whether the id exists.
  const refusal = booking
    ? refuseCancellation(booking, now)
    : "not_cancellable";
  if (!booking || refusal) {
    return (
      <DeadLink
        message={refusal ? refusalMessage(refusal) : copy.invalidLink}
      />
    );
  }

  return (
    <Screen>
      <CancelConfirmForm
        bookingId={parsed.data}
        preview={cancellationPreviewOf(booking, now)}
        token={token}
      />
    </Screen>
  );
}
