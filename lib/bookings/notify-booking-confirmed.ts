// The mails a confirmed booking sends (Bilag 1 "E-mails"): Mail 4 to the
// booker's work email and Mail 8 to ADMIN_NOTIFY_EMAIL. Fired from both
// confirmation paths — the member's code (lib/bookings/actions.ts) and an
// admin booking on a company's behalf (lib/bookings/admin-actions.ts,
// ADR-0023) — from one read under the caller's session and RLS. A missing
// or failed send never blocks the booking: the failure is logged in
// outbound_emails and reported to Sentry keyed on booking number and
// company id only (docs/agents/stack.md).
import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminNewBookingVariables } from "@/emails/templates/admin-new-booking.ts";
import { bookingConfirmationVariables } from "@/emails/templates/booking-confirmation.ts";
import { bookingLinkUrl } from "@/lib/auth/next-path";
import { sendMail } from "@/lib/email/send-mail";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// House Service, House Host and Lunch are part of the default catalogue
// with fixed ids kept aligned across environments (migration
// 20260917120000_seed_house_addons.sql, seed.sql). The mail's Ja/Nej flags
// read the add-on lines against them.
const HOUSE_SERVICE_ADDON_ID = "00000000-0000-0000-0000-0000000000d1";
const HOUSE_HOST_ADDON_ID = "00000000-0000-0000-0000-0000000000d2";
const LUNCH_ADDON_ID = "00000000-0000-0000-0000-0000000000d3";

interface BookingNotifyRow {
  booking_addon_total_ore: number;
  booking_addons: Array<{
    booking_addon_addon_id: string;
    booking_addon_quantity: number;
    booking_addon_total_ore: number;
    addons: { addon_name: string } | null;
  }> | null;
  booking_booker_email: string;
  booking_booker_name: string;
  booking_booker_phone: string;
  booking_company_id: string;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_id: string;
  booking_number: string;
  booking_participant_count: number;
  booking_practical_notes: string | null;
  booking_room_price_ore: number;
  booking_start_at: string;
  companies: {
    company_display_name: string;
    company_legal_name: string | null;
  } | null;
  rooms: { room_name: string } | null;
}

async function loadConfirmedBooking(
  client: Client,
  bookingId: string
): Promise<BookingNotifyRow | null> {
  const { data } = await client
    .from("bookings")
    .select(
      `booking_addon_total_ore, booking_booker_email, booking_booker_name,
       booking_booker_phone, booking_company_id, booking_discount_percent,
       booking_end_at, booking_expected_total_ore, booking_id, booking_number,
       booking_participant_count, booking_practical_notes,
       booking_room_price_ore, booking_start_at,
       booking_addons (
         booking_addon_addon_id, booking_addon_quantity,
         booking_addon_total_ore,
         addons ( addon_name )
       ),
       companies ( company_display_name, company_legal_name ),
       rooms ( room_name )`
    )
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data;
}

const sentryTags = (booking: BookingNotifyRow) => ({
  booking_number: booking.booking_number,
  company_id: booking.booking_company_id,
});

const addOnLinesOf = (booking: BookingNotifyRow) =>
  (booking.booking_addons ?? []).map((line) => ({
    addonName: line.addons?.addon_name ?? null,
    quantity: line.booking_addon_quantity,
    totalOre: line.booking_addon_total_ore,
  }));

// Null-safe fallbacks for the optional joined company, room, and add-ons
// account for the complexity score; the function only maps mail variables.
// fallow-ignore-next-line complexity
const adminNewBookingVariablesOf = (
  booking: BookingNotifyRow
): Record<string, string> => {
  const addOns = booking.booking_addons ?? [];
  const addOnIds = new Set(addOns.map((line) => line.booking_addon_addon_id));
  return adminNewBookingVariables({
    actionUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/bookings`,
    addOnLines: addOnLinesOf(booking),
    bookerEmail: booking.booking_booker_email,
    bookerName: booking.booking_booker_name,
    bookerPhone: booking.booking_booker_phone,
    bookingEndAt: booking.booking_end_at,
    bookingExpectedTotalOre: booking.booking_expected_total_ore,
    bookingNumber: booking.booking_number,
    bookingParticipantCount: booking.booking_participant_count,
    bookingPracticalNotes: booking.booking_practical_notes,
    bookingRoomPriceOre: booking.booking_room_price_ore,
    bookingStartAt: booking.booking_start_at,
    companyDisplayName: booking.companies?.company_display_name ?? "",
    companyLegalName: booking.companies?.company_legal_name ?? null,
    discountPercent: booking.booking_discount_percent,
    hasCatering: addOnIds.has(LUNCH_ADDON_ID),
    hasHouseHost: addOnIds.has(HOUSE_HOST_ADDON_ID),
    hasHouseService: addOnIds.has(HOUSE_SERVICE_ADDON_ID),
    roomName: booking.rooms?.room_name ?? "",
  });
};

// Null-safe fallbacks for the optional joined company and room account for
// the complexity score; the function only maps mail variables.
// fallow-ignore-next-line complexity
const bookingConfirmationVariablesOf = (
  booking: BookingNotifyRow
): Record<string, string> =>
  bookingConfirmationVariables({
    addOnLines: addOnLinesOf(booking),
    bookerName: booking.booking_booker_name,
    bookingNumber: booking.booking_number,
    bookingUrl: bookingLinkUrl(env.NEXT_PUBLIC_SITE_URL, booking.booking_id),
    companyDisplayName: booking.companies?.company_display_name ?? "",
    discountPercent: booking.booking_discount_percent,
    endAt: booking.booking_end_at,
    expectedTotalOre: booking.booking_expected_total_ore,
    participantCount: booking.booking_participant_count,
    roomName: booking.rooms?.room_name ?? "",
    roomPriceOre: booking.booking_room_price_ore,
    startAt: booking.booking_start_at,
  });

async function sendBookingConfirmation(
  booking: BookingNotifyRow
): Promise<void> {
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "booking-confirmation",
      to: booking.booking_booker_email,
      variables: bookingConfirmationVariablesOf(booking),
    });
  } catch (error) {
    captureException(error, { tags: sentryTags(booking) });
  }
}

async function sendAdminNewBooking(booking: BookingNotifyRow): Promise<void> {
  const to = env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    captureException(
      new Error("ADMIN_NOTIFY_EMAIL is not set; Mail 8 was not sent"),
      { tags: sentryTags(booking) }
    );
    return;
  }
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "admin-new-booking",
      to,
      variables: adminNewBookingVariablesOf(booking),
    });
  } catch (error) {
    captureException(error, { tags: sentryTags(booking) });
  }
}

export async function notifyBookingConfirmed(
  client: Client,
  bookingId: string
): Promise<void> {
  const booking = await loadConfirmedBooking(client, bookingId);
  if (!booking) {
    return;
  }
  await Promise.all([
    sendBookingConfirmation(booking),
    sendAdminNewBooking(booking),
  ]);
}
