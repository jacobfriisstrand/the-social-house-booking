// Cancellation (#5, Bilag 1 "Afbooking", ADR-0006) shared by the three
// entry points: the secure link (public page, unauthenticated — service-role
// allowlist entry 2), the member's booking sheet, and the admin actions.
// The fee is always recomputed at the exact confirm moment from the booking's
// frozen price snapshot columns (ADR-0005); the preview a screen shows is
// the same computation at its render time. The row update is guarded so
// only a confirmed, still-upcoming booking can cancel, and nothing is
// deleted: the row stays as history with status, time, fee and actor.
import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingCancelledAdminVariables } from "@/emails/templates/admin-booking-cancelled.ts";
import { bookingCancelledVariables } from "@/emails/templates/booking-cancelled.ts";
import {
  bookingCancellationFeeOre,
  type CancellationBasis,
  memberPriceOreForBooking,
} from "@/lib/domain/cancellation";
import { sendMail } from "@/lib/email/send-mail";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { messages } from "@/messages/da";

export type CancellationClient = SupabaseClient<Database>;

export type CancelledBy = Database["public"]["Enums"]["booking_cancelled_by"];

// The booking columns the cancellation flow reads, with the two names the
// screens show. A joined shape, so room and company come in one round trip.
export interface CancellationBooking {
  booking_addon_total_ore: number;
  booking_booker_email: string;
  booking_booker_name: string;
  booking_company_id: string;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_id: string;
  booking_number: string;
  booking_room_price_ore: number;
  booking_start_at: string;
  booking_status: Database["public"]["Enums"]["booking_status"];
  companies: { company_display_name: string } | null;
  rooms: { room_name: string } | null;
}

export const CANCEL_SELECT = `
  booking_addon_total_ore, booking_booker_email, booking_booker_name,
  booking_company_id, booking_discount_percent, booking_end_at,
  booking_expected_total_ore, booking_id, booking_number,
  booking_room_price_ore, booking_start_at, booking_status,
  companies ( company_display_name ),
  rooms ( room_name )`;

export async function loadBookingForCancellation(
  client: CancellationClient,
  bookingId: string
): Promise<CancellationBooking | null> {
  const { data } = await client
    .from("bookings")
    .select(CANCEL_SELECT)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data;
}

// The fee inputs, from the snapshot columns (ADR-0005): the member price the
// tier applies to (ADR-0006).
export const cancellationBasisOf = (
  booking: Pick<
    CancellationBooking,
    | "booking_discount_percent"
    | "booking_end_at"
    | "booking_room_price_ore"
    | "booking_start_at"
  >
): CancellationBasis => ({
  bookingDiscountPercent: booking.booking_discount_percent,
  bookingEndAt: new Date(booking.booking_end_at),
  bookingRoomPriceOre: booking.booking_room_price_ore,
  bookingStartAt: new Date(booking.booking_start_at),
});

// The live fee for a screen: tier read at `now` against the member price.
export const cancellationFeeAt = (
  booking: Parameters<typeof cancellationBasisOf>[0],
  now: Date
): number => bookingCancellationFeeOre(cancellationBasisOf(booking), now);

export interface CancellationPreview {
  addOnsOre: number;
  bookerName: string;
  bookingNumber: string;
  companyDisplayName: string;
  endAt: string;
  feeOre: number;
  memberPriceOre: number;
  roomName: string;
  startAt: string;
}

// What Platform message 1 shows before the user confirms: the booking, the
// member price the fee is computed on, and the fee as it stands right now.
// Null-safe fallbacks for optional company and room joins account for the
// complexity score; the function only maps the cancellation preview.
// fallow-ignore-next-line complexity
export const cancellationPreviewOf = (
  booking: CancellationBooking,
  now: Date
): CancellationPreview => ({
  addOnsOre: booking.booking_addon_total_ore,
  bookerName: booking.booking_booker_name,
  bookingNumber: booking.booking_number,
  companyDisplayName: booking.companies?.company_display_name ?? "",
  endAt: booking.booking_end_at,
  feeOre: cancellationFeeAt(booking, now),
  memberPriceOre: memberPriceOreForBooking(cancellationBasisOf(booking)),
  roomName: booking.rooms?.room_name ?? "",
  startAt: booking.booking_start_at,
});

const sentryTags = (booking: CancellationBooking) => ({
  booking_number: booking.booking_number,
  company_id: booking.booking_company_id,
});

interface CancellationMailVariables {
  addOnsOre: number;
  bookingNumber: string;
  cancelledAt: string;
  endAt: string;
  feeOre: number;
  roomName: string;
  startAt: string;
}

async function sendBookerCancellationMail(
  booking: CancellationBooking,
  variables: CancellationMailVariables
): Promise<void> {
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "booking-cancelled",
      to: booking.booking_booker_email,
      variables: bookingCancelledVariables({
        ...variables,
        companyDisplayName: booking.companies?.company_display_name ?? "",
      }),
    });
  } catch (error) {
    captureException(error, { tags: sentryTags(booking) });
  }
}

// The missing-recipient and failed-delivery branches must not block a
// registered cancellation.
// fallow-ignore-next-line complexity
async function sendAdminCancellationMail(
  booking: CancellationBooking,
  variables: CancellationMailVariables
): Promise<void> {
  const adminTo = env.ADMIN_NOTIFY_EMAIL;
  if (!adminTo) {
    captureException(
      new Error("ADMIN_NOTIFY_EMAIL is not set; Mail 9 was not sent"),
      { tags: sentryTags(booking) }
    );
    return;
  }
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "admin-booking-cancelled",
      to: adminTo,
      variables: bookingCancelledAdminVariables({
        ...variables,
        bookerName: booking.booking_booker_name,
        companyDisplayName: booking.companies?.company_display_name ?? "",
      }),
    });
  } catch (error) {
    captureException(error, { tags: sentryTags(booking) });
  }
}

// Mail 7 to the booker and Mail 9 to the admin advisory address (docs/
// agents/email.md). A failed send never rolls the cancellation back: the
// row is the system's registered decision, the failure is logged in
// outbound_emails, and Sentry gets the error keyed on booking number and
// company id only. Unset ADMIN_NOTIFY_EMAIL skips Mail 9 with a report,
// like Mail 10. The mails quote the registered cancellation time — the
// same instant the row carries, never a later one.
export async function sendCancellationMails(
  booking: CancellationBooking,
  input: { cancelledAt: string; feeOre: number }
): Promise<void> {
  const variables: CancellationMailVariables = {
    addOnsOre: booking.booking_addon_total_ore,
    bookingNumber: booking.booking_number,
    cancelledAt: input.cancelledAt,
    endAt: booking.booking_end_at,
    feeOre: input.feeOre,
    roomName: booking.rooms?.room_name ?? "",
    startAt: booking.booking_start_at,
  };

  await sendBookerCancellationMail(booking, variables);
  await sendAdminCancellationMail(booking, variables);
}

export interface CancellationOutcome {
  bookingId: string;
  feeOre: number;
}

// Why a booking cannot be cancelled right now (#5). Each state maps to one
// plain sentence; a row the caller cannot see (RLS on the session path)
// reads as not cancellable, never as someone else's booking.
export type CancellationRefusal =
  | "already_cancelled"
  | "not_cancellable"
  | "start_passed";

const refusalMessages: Record<CancellationRefusal, string> = {
  already_cancelled: messages.cancellation.alreadyCancelled,
  not_cancellable: messages.booking.errors.notCancellable,
  start_passed: messages.cancellation.noLongerUpcoming,
};

export const refusalMessage = (refusal: CancellationRefusal): string =>
  refusalMessages[refusal];

// The guard the screens show before the write: only a confirmed booking
// whose start has not passed can cancel. The write re-checks the same
// conditions atomically (cancelConfirmedBooking), so a booking that slips
// past while the screen is open still fails the write, never the rules.
export function refuseCancellation(
  booking: CancellationBooking,
  now: Date
): CancellationRefusal | null {
  if (booking.booking_status === "cancelled") {
    return "already_cancelled";
  }
  if (booking.booking_status !== "confirmed") {
    return "not_cancellable";
  }
  if (new Date(booking.booking_start_at).getTime() <= now.getTime()) {
    return "start_passed";
  }
  return null;
}

export interface ConfirmCancellationOutcome {
  feeOre: number;
  ok: true;
}

export interface RefusedCancellation {
  ok: false;
  refusal: CancellationRefusal;
}

// The shared confirm behind the member link, the booking sheet and the
// admin action: refuse, recompute the fee at this exact instant (the
// preview's fee is a render-time estimate; this is the registered one),
// write the guarded row, then send the two mails.
export async function confirmCancellation(
  client: CancellationClient,
  bookingId: string,
  cancelledBy: CancelledBy
): Promise<ConfirmCancellationOutcome | RefusedCancellation> {
  const now = new Date();
  const booking = await loadBookingForCancellation(client, bookingId);
  if (!booking) {
    return { ok: false, refusal: "not_cancellable" };
  }
  const refusal = refuseCancellation(booking, now);
  if (refusal) {
    return { ok: false, refusal };
  }
  const outcome = await cancelConfirmedBooking(client, bookingId, {
    cancelledBy,
    feeOre: cancellationFeeAt(booking, now),
    now,
  });
  if (!outcome) {
    // Lost the race (a double confirm or a slot that slipped past while
    // the screen was open) — the same screen as any other refusal.
    return { ok: false, refusal: "not_cancellable" };
  }
  await sendCancellationMails(booking, {
    cancelledAt: now.toISOString(),
    feeOre: outcome.feeOre,
  });
  return { feeOre: outcome.feeOre, ok: true };
}

// The guarded write every cancellation goes through (member link, member
// sheet, admin): only a still-confirmed booking whose start has not passed
// cancels, so a double confirm, an expired link and a past booking all
// match zero rows. The fee is computed by the caller at the same instant.
export async function cancelConfirmedBooking(
  client: CancellationClient,
  bookingId: string,
  input: {
    cancelledBy: CancelledBy;
    feeOre: number;
    now: Date;
  }
): Promise<CancellationOutcome | null> {
  const now = input.now.toISOString();
  const cancelled = await client
    .from("bookings")
    .update({
      booking_cancellation_fee_ore: input.feeOre,
      booking_cancelled_at: now,
      booking_cancelled_by: input.cancelledBy,
      booking_status: "cancelled",
    })
    .eq("booking_id", bookingId)
    .eq("booking_status", "confirmed")
    .gt("booking_start_at", now)
    .select("booking_id");
  if (cancelled.error || cancelled.data.length === 0) {
    return null;
  }
  return { bookingId, feeOre: input.feeOre };
}
