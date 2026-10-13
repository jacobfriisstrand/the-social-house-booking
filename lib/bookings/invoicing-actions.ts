"use server";

// The admin invoicing actions (#9): mark bookings invoiced — with the
// invoice date and number from e-conomic — or move them between not
// invoiced and not invoicable. One set-status action serves the row menu
// and the bulk header alike: the row menu passes the one booking, the bulk
// header the whole selection. Marking invoiced needs the dialog's date and
// number, so it keeps its form action; the other two targets move
// instantly. The writes run under the admin's session and RLS, in one
// update per action, so the record_invoicing_event trigger
// (schemas/bookings.sql) leaves one audit row per booking inside the same
// transaction. The who/when of the invoice are set by the trigger; this
// action only carries date and number. The rules the UI already keeps —
// only an ended booking can be invoiced, any booking can be un-invoiced or
// refused — are re-checked here and enforced again in Postgres.

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import {
  type MarkInvoicedValues,
  markInvoicedSchema,
  resolvedInvoiceNumbers,
} from "@/lib/validation/invoicing";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.markInvoiced;

// The refusals Postgres raises (schemas/bookings.sql): the future-booking
// guard on the invoice mark is P0001, the admin-only guard 42501 — both
// surface only on a race (the list revalidated between load and submit).
const FUTURE_REFUSAL =
  "a booking can first be marked invoiced after its end time";

const refusalMessage = (message: string): string =>
  message === FUTURE_REFUSAL ? copy.errors.future : copy.errors.failed;

interface InvoiceCandidate {
  booking_end_at: string;
  booking_id: string;
  booking_invoicing_status: "invoiced" | "not_invoiced" | "not_invoicable";
}

// The set the admin saw, re-checked: every booking must exist, have ended,
// and still be open for an invoice — not invoiced, or refused and taken
// back.
async function checkCandidates(
  supabase: SupabaseClient<Database>,
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
      (candidate) => candidate.booking_invoicing_status === "invoiced"
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

  // One update per distinct invoice number: rows sharing a number are one
  // group and one statement; a selection with two numbers is two writes.
  // The groups touch disjoint rows, so they run together; each statement
  // carries the same race guard the single write had.
  // ponytail: the groups are separate transactions — a group that fails
  // leaves the others written, and a retry then dies in the re-check with
  // "already marked" for the rows that did land. One atomic write needs a
  // `mark_bookings_invoiced(jsonb)` RPC, the pattern persist() uses for
  // save_house_event.
  const groups = new Map<string, string[]>();
  for (const [bookingId, invoiceNumber] of resolvedInvoiceNumbers(
    parsed.data
  )) {
    groups.set(invoiceNumber, [
      ...(groups.get(invoiceNumber) ?? []),
      bookingId,
    ]);
  }
  const results = await Promise.all(
    [...groups].map(([invoiceNumber, bookingIds]) =>
      supabase
        .from("bookings")
        .update({
          booking_invoice_date: parsed.data.invoiceDate,
          booking_invoice_number: invoiceNumber,
          booking_invoicing_status: "invoiced",
        })
        .in("booking_id", bookingIds)
        // The guard the re-check races against: an already-invoiced row
        // stays untouched instead of being marked twice; a refused row is
        // a valid source, taken back into the basis.
        .in("booking_invoicing_status", ["not_invoiced", "not_invoicable"])
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { error: refusalMessage(failed.error.message), status: "error" };
  }

  revalidatePath("/admin/bookings");
  return { status: "success" };
}

// The shared result shape of the instant status moves.
export type InvoicingStatusResult =
  | { status: "success" }
  | { status: "error"; error: string };

// One status move for the row menu and the bulk header alike — the row
// menu passes the one booking, the bulk header the whole selection. "Not
// invoiced" takes a booking back from invoiced or refused; "not
// invoicable" takes any booking out of the basis, a future one included
// (the trigger guards only the invoice mark). The re-check is light: the
// rows must exist under this admin's session — the trigger re-runs every
// rule — and the status filter skips rows already in the target state, so
// a race between render and submit is a no-op instead of an error.
export async function setBookingsInvoicingStatus(
  bookingIds: readonly string[],
  target: "not_invoiced" | "not_invoicable"
): Promise<InvoicingStatusResult> {
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
  if (candidates.length !== bookingIds.length) {
    return { error: copy.errors.failed, status: "error" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ booking_invoicing_status: target })
    .in("booking_id", [...bookingIds])
    .in(
      "booking_invoicing_status",
      target === "not_invoiced"
        ? ["invoiced", "not_invoicable"]
        : ["not_invoiced", "invoiced"]
    );
  if (error) {
    return { error: copy.errors.failed, status: "error" };
  }

  revalidatePath("/admin/bookings");
  return { status: "success" };
}
