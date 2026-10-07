// Mail 5 (#11, docs/agents/email.md "The hourly job"): the reminder half of
// the job route. It runs without a session, so the route passes its
// service-role client in. Each run reminds the confirmed bookings in the
// reminder window that have no reminder logged yet. A cancelled booking
// never matches and a changed one is read as it stands now, so nothing has
// to be rescheduled. A failed send is logged in outbound_emails by
// sendMail() and reported to Sentry on booking number and company id only
// (docs/agents/stack.md); the run carries on with the next booking.
import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reminderVariables } from "@/emails/templates/reminder.ts";
import { bookingLinkUrl } from "@/lib/auth/next-path";
import { reminderWindow } from "@/lib/domain/reminder";
import { sendMail } from "@/lib/email/send-mail";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { cancellationFeeAt } from "./cancellation";

type Client = SupabaseClient<Database>;

// One window holds at most a booking or two per room; the cap keeps a run
// well inside Netlify's 30 s function limit.
const BATCH_SIZE = 100;

const REMINDER_SELECT = `
  booking_booker_email, booking_booker_name, booking_company_id,
  booking_discount_percent, booking_end_at, booking_id, booking_number,
  booking_participant_count, booking_room_price_ore, booking_start_at,
  booking_addons ( booking_addon_quantity, addons ( addon_name ) ),
  companies ( company_display_name ),
  rooms ( room_name, room_practical_notes )`;

export interface ReminderRun {
  due: number;
  failed: number;
  sent: number;
}

async function dueBookings(client: Client, now: Date) {
  const window = reminderWindow(now);
  const bookings = await client
    .from("bookings")
    .select(REMINDER_SELECT)
    .eq("booking_status", "confirmed")
    .gt("booking_start_at", window.after.toISOString())
    .lte("booking_start_at", window.until.toISOString())
    .order("booking_start_at")
    .limit(BATCH_SIZE);
  if (bookings.error) {
    throw new Error(
      `could not read bookings due a reminder: ${bookings.error.message}`
    );
  }
  const logged = await client
    .from("outbound_emails")
    .select("outbound_email_booking_id")
    .eq("outbound_email_kind", "reminder")
    .in(
      "outbound_email_booking_id",
      bookings.data.map((booking) => booking.booking_id)
    );
  if (logged.error) {
    throw new Error(`could not read sent reminders: ${logged.error.message}`);
  }
  const reminded = new Set(
    logged.data.map((row) => row.outbound_email_booking_id)
  );
  return bookings.data.filter((booking) => !reminded.has(booking.booking_id));
}

type DueBooking = Awaited<ReturnType<typeof dueBookings>>[number];

// Null-safe fallbacks for the optional joined company, room, and add-ons
// account for the complexity score; the function only maps mail variables.
// fallow-ignore-next-line complexity
const variablesOf = (booking: DueBooking, now: Date) =>
  reminderVariables({
    addOnLines: (booking.booking_addons ?? []).map((line) => ({
      addonName: line.addons?.addon_name ?? null,
      quantity: line.booking_addon_quantity,
    })),
    bookerName: booking.booking_booker_name,
    bookingNumber: booking.booking_number,
    bookingUrl: bookingLinkUrl(env.NEXT_PUBLIC_SITE_URL, booking.booking_id),
    cancellationFeeOre: cancellationFeeAt(booking, now),
    companyDisplayName: booking.companies?.company_display_name ?? "",
    endAt: booking.booking_end_at,
    participantCount: booking.booking_participant_count,
    roomName: booking.rooms?.room_name ?? "",
    roomPracticalNotes: booking.rooms?.room_practical_notes ?? null,
    startAt: booking.booking_start_at,
  });

async function remind(booking: DueBooking, now: Date): Promise<boolean> {
  try {
    await sendMail({
      bookingId: booking.booking_id,
      companyId: booking.booking_company_id,
      kind: "reminder",
      to: booking.booking_booker_email,
      variables: variablesOf(booking, now),
    });
    return true;
  } catch (error) {
    captureException(error, {
      tags: {
        booking_number: booking.booking_number,
        company_id: booking.booking_company_id,
      },
    });
    return false;
  }
}

export async function sendDueReminders(
  client: Client,
  now: Date
): Promise<ReminderRun> {
  const due = await dueBookings(client, now);
  const run: ReminderRun = { due: due.length, failed: 0, sent: 0 };
  for (const booking of due) {
    // biome-ignore lint/performance/noAwaitInLoops: Resend rate-limits the API at 2 requests per second; a window holds a few bookings, sent one at a time on purpose.
    if (await remind(booking, now)) {
      run.sent += 1;
    } else {
      run.failed += 1;
    }
  }
  return run;
}
