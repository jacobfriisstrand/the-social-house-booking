"use server";

// Manual amounts (#16, ADR-0010): the admin adds a post-meeting amount with
// a short explanation — the reason can be anything, for example a room not
// returned to standard — and removes one again while the booking still
// waits for its invoice. Rows are written and deleted under the admin's
// session and RLS (admin-only insert and delete policies), and the creator
// and timestamp are the audit (who/when). The post-meeting rule — no amount
// before the booking's end time has passed, none on a cancelled booking —
// is enforced in Postgres (schemas/manual_amounts.sql) and mapped to its
// message here.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import {
  type AddManualAmountValues,
  addManualAmountSchema,
} from "@/lib/validation/manual-amounts";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.manualAmounts;

// The refusals Postgres raises from enforce_manual_amount_after_meeting
// (schemas/manual_amounts.sql): P0001, and the invoiced one is
// distinguished by its exact message — the sheet is unreachable for an
// invoiced booking through the worklist, so these surface only on a race
// (the booking invoiced while the sheet stood open).
const POST_MEETING_VIOLATION = "P0001";
const INVOICED_REFUSAL = "the booking is already invoiced";

export type ManualAmountState = FormState<AddManualAmountValues>;

export async function addManualAmount(
  _previousState: ManualAmountState,
  values: AddManualAmountValues
): Promise<ManualAmountState> {
  const session = await requireAdmin();
  const parsed = addManualAmountSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<AddManualAmountValues>(
      parsed.error,
      copy.errors.addFailed
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.from("manual_amounts").insert({
    manual_amount_amount_ore: parsed.data.amountKroner * 100,
    manual_amount_booking_id: parsed.data.bookingId,
    manual_amount_created_by: session.userId,
    manual_amount_note: parsed.data.note,
  });
  if (error) {
    if (error.code !== POST_MEETING_VIOLATION) {
      return { error: copy.errors.addFailed, status: "error" };
    }
    return {
      error:
        error.message === INVOICED_REFUSAL
          ? copy.errors.invoiced
          : copy.errors.tooEarly,
      status: "error",
    };
  }
  revalidatePath("/admin/bookings");
  return { status: "success" };
}

// The same result shape the shared ConfirmDeleteButton consumes.
export type ManualAmountActionResult =
  | { status: "success" }
  | { status: "error"; error: string };

export async function removeManualAmount(
  manualAmountId: string
): Promise<ManualAmountActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("manual_amounts")
    .delete()
    .eq("manual_amount_id", manualAmountId);
  if (error) {
    return { error: copy.errors.removeFailed, status: "error" };
  }
  revalidatePath("/admin/bookings");
  return { status: "success" };
}
