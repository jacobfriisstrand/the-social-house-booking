"use server";

// Cancellation via the secure link and the booking sheet (#5, Bilag 1
// "Afbooking"). The link carries no session, so its confirm writes through
// the service-role client — allowlist entry 2 in docs/agents/supabase.md —
// after the timing-safe token check in lib/domain/cancel-link.ts. The
// member's sheet cancels under the company's session and RLS. Both paths
// converge on confirmCancellation() in ./cancellation, which recomputes the
// fee at the exact confirm moment and fires Mail 7 and Mail 9.
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { cancellationLinkIsValid } from "@/lib/domain/cancel-link";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  type CancelByLinkValues,
  cancelByLinkSchema,
} from "@/lib/validation/booking";
import type { FormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { confirmCancellation, refusalMessage } from "./cancellation";

const copy = messages.cancellation;

export type CancelByLinkState = FormState<CancelByLinkValues>;

// The member's sheet cancels under the company's session; an admin has no
// company and cancels (and waives) through the admin actions instead, so
// the member path never writes a foreign booking.
export type OwnCancelState =
  | { feeOre: number; status: "cancelled" }
  | { error: string; status: "error" };

// "Bekræft afbooking" on the public page: token first, then the same
// confirm. A valid token for a booking that is not live reads as a refusal,
// so the page never discloses whether the id exists.
export async function confirmCancellationByLink(
  _prevState: CancelByLinkState,
  values: CancelByLinkValues
): Promise<CancelByLinkState> {
  const parsed = cancelByLinkSchema.safeParse(values);
  if (!parsed.success) {
    return { error: copy.invalidLink, linkInvalid: true, status: "error" };
  }
  const { bookingId, token } = parsed.data;
  if (!cancellationLinkIsValid(env.BOOKING_CANCEL_SECRET, bookingId, token)) {
    return { error: copy.invalidLink, linkInvalid: true, status: "error" };
  }
  const outcome = await confirmCancellation(
    createAdminClient(),
    bookingId,
    "member"
  );
  if (!outcome.ok) {
    return { error: refusalMessage(outcome.refusal), status: "error" };
  }
  return { status: "success" };
}

// "Aflys booking" from the booking sheet (#5, DESIGN.md member overview):
// the company's own confirmed, upcoming booking, cancelled under its
// session and RLS.
export async function cancelOwnBooking(
  bookingId: string
): Promise<OwnCancelState> {
  const session = await requireSession();
  if (session.appRole === "admin") {
    redirect("/?unauthorized=1");
  }
  const supabase = await createClient();
  const outcome = await confirmCancellation(supabase, bookingId, "member");
  if (!outcome.ok) {
    return { error: refusalMessage(outcome.refusal), status: "error" };
  }
  return { feeOre: outcome.feeOre, status: "cancelled" };
}
