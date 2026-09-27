// Mail 8 (#5, Bilag 1 "E-mails"): the admin advisory that a booking is
// confirmed. Fired from both confirmation paths — the member's code
// (lib/bookings/actions.ts) and an admin booking on a company's behalf
// (lib/bookings/admin-actions.ts, ADR-0023) — read under the caller's
// session and RLS, and sent to ADMIN_NOTIFY_EMAIL like the other admin
// advisories. A missing or failed send never blocks the booking: the
// failure is logged in outbound_emails and reported to Sentry keyed on
// booking number and company id only (docs/agents/stack.md).
import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminNewBookingVariables } from "@/emails/templates/admin-new-booking.ts";
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

export interface BookingNotifyRow {
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

export async function loadBookingForAdminNotify(
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

export async function notifyAdminNewBooking(
  client: Client,
  bookingId: string
): Promise<void> {
  const booking = await loadBookingForAdminNotify(client, bookingId);
  if (!booking) {
    return;
  }
  const to = env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    captureException(
      new Error("ADMIN_NOTIFY_EMAIL is not set; Mail 8 was not sent"),
      { tags: sentryTags(booking) }
    );
    return;
  }
  const addOnIds = (booking.booking_addons ?? []).map(
    (line) => line.booking_addon_addon_id
  );
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "admin-new-booking",
      to,
      variables: adminNewBookingVariables({
        actionUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/bookings`,
        addOnLines: (booking.booking_addons ?? []).map((line) => ({
          addonName: line.addons?.addon_name ?? null,
          quantity: line.booking_addon_quantity,
          totalOre: line.booking_addon_total_ore,
        })),
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
        hasCatering: addOnIds.includes(LUNCH_ADDON_ID),
        hasHouseHost: addOnIds.includes(HOUSE_HOST_ADDON_ID),
        hasHouseService: addOnIds.includes(HOUSE_SERVICE_ADDON_ID),
        roomName: booking.rooms?.room_name ?? "",
      }),
    });
  } catch (error) {
    captureException(error, { tags: sentryTags(booking) });
  }
}
