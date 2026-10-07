"use server";

// The admin invoicing actions (#9): mark the selected bookings as invoiced
// — with the invoice date and number from e-conomic — or as not invoicable.
// The writes run under the admin's session and RLS, in one update per
// action, so the bulk mark is one statement and the record_invoicing_event
// trigger (schemas/bookings.sql) leaves one audit row per booking inside
// the same transaction. The who/when of the invoice are set by the
// trigger; this action only carries date and number. The rules the UI
// already keeps — only ended bookings, only not-invoiced ones — are
// re-checked here and enforced again in Postgres.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import {
  type MarkInvoicedValues,
  markInvoicedSchema,
} from "@/lib/validation/invoicing";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.markInvoiced;

// The refusals Postgres raises (schemas/bookings.sql): the future-booking
// guard is P0001, the admin-only guard 42501 — both surface only on a race
// (the list revalidated between load and submit).
const FUTURE_REFUSAL =
  "a booking can first be marked invoiced or not invoicable after its end time";

const refusalMessage = (message: string): string =>
  message === FUTURE_REFUSAL ? copy.errors.future : copy.errors.failed;

interface InvoiceCandidate {
  booking_end_at: string;
  booking_id: string;
  booking_invoicing_status: "invoiced" | "not_invoiced" | "not_invoicable";
}

// The set the admin saw, re-checked: every booking must exist, have ended,
// and still wait for its invoice.
async function checkCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingIds: readonly string[]
): Promise<InvoiceCandidate[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_id, booking_end_at, booking_invoicing_status")
    .in("booking_id", [...bookingIds]);
  if (error) {
    throw new Error(`could not read invoice candidates: ${error.message}`);
  }
  return data;
}

function candidateError(
  candidates: InvoiceCandidate[],
  bookingIds: readonly string[]
): string | null {
  const nowMs = Date.now();
  if (candidates.length !== bookingIds.length) {
    return copy.errors.failed;
  }
  if (
    candidates.some(
      (candidate) => new Date(candidate.booking_end_at).getTime() > nowMs
    )
  ) {
    return copy.errors.future;
  }
  if (
    candidates.some(
      (candidate) => candidate.booking_invoicing_status !== "not_invoiced"
    )
  ) {
    return copy.errors.alreadyMarked;
  }
  return null;
}

export type MarkInvoicedState = FormState<MarkInvoicedValues>;

export async function markBookingsInvoiced(
  _previousState: MarkInvoicedState,
  values: MarkInvoicedValues
): Promise<MarkInvoicedState> {
  await requireAdmin();
  const parsed = markInvoicedSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<MarkInvoicedValues>(
      parsed.error,
      copy.errors.failed
    );
  }
  const supabase = await createClient();
  let candidates: InvoiceCandidate[];
  try {
    candidates = await checkCandidates(supabase, parsed.data.bookingIds);
  } catch {
    return { error: copy.errors.failed, status: "error" };
  }
  const refused = candidateError(candidates, parsed.data.bookingIds);
  if (refused) {
    return { error: refused, status: "error" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      booking_invoice_date: parsed.data.invoiceDate,
      booking_invoice_number: parsed.data.invoiceNumber,
      booking_invoicing_status: "invoiced",
    })
    .in("booking_id", [...parsed.data.bookingIds])
    // The guard the re-check races against: an already-invoiced row stays
    // untouched instead of being marked twice.
    .eq("booking_invoicing_status", "not_invoiced");
  if (error) {
    return { error: refusalMessage(error.message), status: "error" };
  }

  revalidatePath("/admin/bookings");
  return { status: "success" };
}

// The same result shape the shared confirm-dialog buttons consume.
export type MarkNotInvoicableResult =
  | { status: "success" }
  | { status: "error"; error: string };

export async function markBookingsNotInvoicable(
  bookingIds: readonly string[]
): Promise<MarkNotInvoicableResult> {
  await requireAdmin();
  if (bookingIds.length === 0) {
    return { error: copy.errors.failed, status: "error" };
  }
  const supabase = await createClient();
  let candidates: InvoiceCandidate[];
  try {
    candidates = await checkCandidates(supabase, bookingIds);
  } catch {
    return { error: copy.errors.failed, status: "error" };
  }
  const refused = candidateError(candidates, bookingIds);
  if (refused) {
    return { error: refused, status: "error" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ booking_invoicing_status: "not_invoicable" })
    .in("booking_id", [...bookingIds])
    .eq("booking_invoicing_status", "not_invoiced");
  if (error) {
    return { error: refusalMessage(error.message), status: "error" };
  }

  revalidatePath("/admin/bookings");
  return { status: "success" };
}
