"use server";

// Admin books on a company's behalf (#14, ADR-0008): external companies
// have no self-service, so their bookings are entered here, in the same
// table and under the same no-overlap constraint as member bookings. The
// row is written under the admin's session and RLS; it is confirmed at
// once, without a hold or a verification code (ADR-0023). The price
// snapshot uses the company's discount, which is 0 for an external company
// (companies_external_no_discount). Mail 4 and Mail 8 are wired by #11.
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminBookingValues,
  adminBookingSchema,
} from "@/lib/validation/booking";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import {
  type BookableRoom,
  EXCLUSION_VIOLATION,
  expireBooking,
  findBookableRoom,
  insertBooking,
  insertBookingAddons,
  newBookingRow,
  type SessionClient,
  type Step,
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

const errorState = (error: string): AdminBookingState => ({
  error,
  status: "error",
});

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

// Status → confirmed. The room-free trigger re-runs on the status change;
// a collision here means a House Event landed meanwhile.
async function confirmBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<string | null> {
  const confirmed = await supabase
    .from("bookings")
    .update({ booking_status: "confirmed" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification")
    .select("booking_id");
  if (confirmed.error) {
    return confirmed.error.code === EXCLUSION_VIOLATION
      ? errors.slotTaken
      : errors.createFailed;
  }
  return confirmed.data.length === 0 ? errors.createFailed : null;
}

// Inserted pending (no hold expiry) so the add-on snapshot rows can be
// written, then confirmed; a failure at any step frees the room again.
async function createConfirmedBooking(
  supabase: SessionClient,
  company: BookingCompany,
  input: AdminBookingValues,
  room: BookableRoom
): Promise<AdminBookingState> {
  const inserted = await insertBooking(supabase, {
    ...newBookingRow(input, company.company_discount_percent, room),
    booking_company_id: company.company_id,
    booking_status: "pending_verification",
  });
  if (!inserted.ok) {
    return inserted.state;
  }
  const { bookingId, bookingNumber } = inserted.value;
  const addonsWritten = await insertBookingAddons(
    supabase,
    bookingId,
    room.addons
  );
  const error = addonsWritten
    ? await confirmBooking(supabase, bookingId)
    : errors.createFailed;
  if (error) {
    await expireBooking(supabase, bookingId);
    return errorState(error);
  }
  return { bookingId, bookingNumber, status: "created" };
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
  return createConfirmedBooking(
    supabase,
    company.value,
    parsed.data,
    room.value
  );
}
