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
import {
  findRoomAndAddOns,
  releasePendingBooking,
  writeAddOnLines,
} from "./addon-lines";
import {
  confirmPendingBooking,
  insertPendingBooking,
  type SessionClient,
  type Step,
  slotFailureMessage,
} from "./new-booking";

const { errors } = messages.booking;
const adminErrors = messages.booking.admin.errors;

export type AdminBookingState =
  | Exclude<FormState<AdminBookingValues>, { status: "success" }>
  | { bookingId: string; bookingNumber: string; status: "created" };

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
  const inserted = await insertPendingBooking(
    supabase,
    company,
    input,
    roomHourlyPriceOre,
    {}
  );
  if (!inserted.ok) {
    return {
      error: slotFailureMessage(inserted.error),
      status: "error",
    };
  }
  const { bookingId } = inserted;
  if (!(await writeAddOnLines(supabase, bookingId, lines))) {
    await releaseBooking(supabase, bookingId);
    return { error: errors.createFailed, status: "error" };
  }
  const confirmed = await confirmPendingBooking(supabase, bookingId);
  if (confirmed) {
    // The confirm re-runs the room-free triggers; a House Event added
    // meanwhile dooms the booking, so the room is released.
    await releaseBooking(supabase, bookingId);
    return {
      error: slotFailureMessage(confirmed),
      status: "error",
    };
  }
  return {
    bookingId,
    bookingNumber: inserted.bookingNumber,
    status: "created",
  };
}

// Frees the room: the exclusion constraint and calendar_entries ignore
// expired rows (#24).
async function releaseBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<void> {
  await releasePendingBooking(supabase, bookingId);
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
  // The same room-and-add-on check as the company flow (#7): the room must
  // be bookable and the ids must belong to it.
  const validated = await findRoomAndAddOns(supabase, parsed.data);
  if (!validated.ok) {
    return validated.state;
  }
  return insertConfirmedBooking(
    supabase,
    company.value,
    parsed.data,
    validated.roomHourlyPriceOre,
    validated.lines
  );
}
