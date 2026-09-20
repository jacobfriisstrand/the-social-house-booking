"use server";

// Admin books on a company's behalf (#14, ADR-0008): external companies
// have no self-service, so their bookings are entered here, in the same
// table and under the same no-overlap constraint as member bookings. The
// row is written under the admin's session and RLS; it is confirmed at
// once, without a hold or a verification code (ADR-0023). The price
// snapshot uses the company's discount, which is 0 for an external company
// (companies_external_no_discount). Mail 4 and Mail 8 are wired by #11.
import { requireAdmin } from "@/lib/auth/require-admin";
import type { AddOnLine } from "@/lib/domain/addons";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminBookingValues,
  adminBookingSchema,
} from "@/lib/validation/booking";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { lineInserts, listRoomAddOns, selectAddOnLines } from "./addon-lines";
import {
  EXCLUSION_VIOLATION,
  findBookableRoom,
  newBookingRow,
  type SessionClient,
  type Step,
} from "./new-booking";

const { errors } = messages.booking;
const adminErrors = messages.booking.admin.errors;

export type AdminBookingState =
  | Exclude<FormState<AdminBookingValues>, { status: "success" }>
  | { bookingNumber: string; status: "created" };

interface BookingCompany {
  company_discount_percent: number;
  company_id: string;
}

const fail = (error: string): Step<never> => ({
  ok: false,
  state: { error, status: "error" },
});

// The same master-data gate the company itself is under (#1): invoicing
// needs the nine fields whoever enters the booking.
async function findBookingCompany(
  supabase: SessionClient,
  companyId: string
): Promise<Step<BookingCompany>> {
  const { data } = await supabase
    .from("companies")
    .select(
      "company_id, company_discount_percent, company_master_data_completed_at"
    )
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data) {
    return fail(adminErrors.companyNotFound);
  }
  if (!data.company_master_data_completed_at) {
    return fail(adminErrors.companyIncomplete);
  }
  return { ok: true, value: data };
}

// Confirmed on insert: the room-free trigger and the no-overlap constraint
// are the availability check, so an unavailable slot fails the insert. The
// add-on lines (#7) must exist before the status becomes confirmed — they
// are part of the price snapshot (ADR-0005) and the add-on freeze trigger
// blocks writes on confirmed bookings — so the row is inserted pending,
// the lines are written, and the same action confirms it at once
// (ADR-0023): no code, no hold the company ever sees. A failed confirm
// releases the room.
async function insertConfirmedBooking(
  supabase: SessionClient,
  company: BookingCompany,
  input: AdminBookingValues,
  roomHourlyPriceOre: number,
  lines: AddOnLine[]
): Promise<AdminBookingState> {
  const inserted = await supabase
    .from("bookings")
    .insert({
      ...newBookingRow(
        input,
        company.company_discount_percent,
        roomHourlyPriceOre
      ),
      booking_catering_accepted_at: new Date().toISOString(),
      booking_company_id: company.company_id,
      booking_status: "pending_verification",
    })
    .select("booking_id, booking_number")
    .single();
  if (inserted.error) {
    const taken = inserted.error.code === EXCLUSION_VIOLATION;
    return {
      error: taken ? errors.slotTaken : errors.createFailed,
      status: "error",
    };
  }
  const bookingId = inserted.data.booking_id;
  if (lines.length > 0) {
    const written = await supabase
      .from("booking_addons")
      .insert(lineInserts(bookingId, lines));
    if (written.error) {
      await releaseBooking(supabase, bookingId);
      return { error: errors.createFailed, status: "error" };
    }
  }
  const confirmed = await supabase
    .from("bookings")
    .update({ booking_status: "confirmed" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
  if (confirmed.error) {
    // The confirm re-runs the room-free triggers; a House Event added
    // meanwhile dooms the booking, so the room is released.
    await releaseBooking(supabase, bookingId);
    const taken = confirmed.error.code === EXCLUSION_VIOLATION;
    return {
      error: taken ? errors.slotTaken : errors.createFailed,
      status: "error",
    };
  }
  return { bookingNumber: inserted.data.booking_number, status: "created" };
}

// Frees the room: the exclusion constraint and calendar_entries ignore
// expired rows (#24).
async function releaseBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<void> {
  await supabase
    .from("bookings")
    .update({ booking_status: "expired" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
}

export async function createAdminBooking(
  _prevState: AdminBookingState,
  values: AdminBookingValues
): Promise<AdminBookingState> {
  await requireAdmin();
  const parsed = adminBookingSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, errors.createFailed);
  }
  const supabase = await createClient();
  const company = await findBookingCompany(supabase, parsed.data.companyId);
  if (!company.ok) {
    return company.state;
  }
  const room = await findBookableRoom(supabase, parsed.data);
  if (!room.ok) {
    return room.state;
  }
  // The same add-on re-check as the company flow (#7): the ids are
  // re-validated against the room's active add-ons.
  const roomAddOns = await listRoomAddOns(supabase, parsed.data.roomId);
  const selection = selectAddOnLines(
    roomAddOns,
    parsed.data.addOnIds,
    parsed.data.participantCount
  );
  if (!selection.ok) {
    return {
      error: selection.error,
      fieldErrors: { addOnIds: [selection.error] },
      status: "error",
    };
  }
  return insertConfirmedBooking(
    supabase,
    company.value,
    parsed.data,
    room.value,
    selection.lines
  );
}
