"use server";

// Cancellation from the member's booking sheet (#5, Bilag 1 "Afbooking"),
// under the company's session and RLS. Cancelling always requires the
// company login (#88, ADR-0024): the link in Mail 4, 5 and 6 opens the
// booking on Bookinger behind login. confirmCancellation() in
// ./cancellation recomputes the fee at the exact confirm moment and fires
// Mail 7 and Mail 9.
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { createClient } from "@/lib/supabase/server";
import { confirmCancellation, refusalMessage } from "./cancellation";

// The member's sheet cancels under the company's session; an admin has no
// company and cancels (and waives) through the admin actions instead, so
// the member path never writes a foreign booking.
export type OwnCancelState =
  | { feeOre: number; status: "cancelled" }
  | { error: string; status: "error" };

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
