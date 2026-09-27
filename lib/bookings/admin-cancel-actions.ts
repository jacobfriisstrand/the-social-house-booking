"use server";

// Admin side of the booking lifecycle (#5): cancel on a company's behalf —
// same guards, same fee, same two mails as the member paths — and waive a
// computed fee for an obvious error corrected immediately after booking
// (Bilag 1 "Ombooking og fejl"). Both run under the admin's session and
// RLS; every change lands in booking_history via the
// bookings_record_history trigger. The screens that call these land with
// the admin bookings view (#9) and the day grid (#12).
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";
import { confirmCancellation, refusalMessage } from "./cancellation";

const { errors } = messages.booking;

export type AdminCancelState =
  | { feeOre: number; status: "cancelled" }
  | { error: string; status: "error" };

export type WaiveState =
  | { status: "waived" }
  | { error: string; status: "error" };

// The admin cancels like the member does — the fee recomputes at the
// confirm moment — but the row records who acted, so the history and the
// admin panel can tell the two apart.
export async function cancelBookingAsAdmin(
  bookingId: string
): Promise<AdminCancelState> {
  await requireAdmin();
  const supabase = await createClient();
  const outcome = await confirmCancellation(supabase, bookingId, "admin");
  if (!outcome.ok) {
    return { error: refusalMessage(outcome.refusal), status: "error" };
  }
  return { feeOre: outcome.feeOre, status: "cancelled" };
}

// Fritagelse (#5, Bilag 1 "Ombooking og fejl"): the computed amount stays
// on the row — the history shows the waive as its own transition — while
// the flag decides whether the fee counts towards the invoicing basis (#9).
// Only a cancelled booking with an unwaived, positive fee can waive, so a
// double call reads as success-with-nothing-to-do rather than an error.
export async function waiveCancellationFee(
  bookingId: string
): Promise<WaiveState> {
  await requireAdmin();
  const supabase = await createClient();
  const waived = await supabase
    .from("bookings")
    .update({ booking_cancellation_fee_waived: true })
    .eq("booking_id", bookingId)
    .eq("booking_status", "cancelled")
    .eq("booking_cancellation_fee_waived", false)
    .gt("booking_cancellation_fee_ore", 0)
    .select("booking_id");
  if (waived.error || waived.data.length === 0) {
    return { error: errors.notCancellable, status: "error" };
  }
  return { status: "waived" };
}
