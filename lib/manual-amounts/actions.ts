"use server";

// Manual amounts (#16, ADR-0010): the admin adds a post-meeting amount with
// a short explanation when a room was not returned to standard. The row is
// written under the admin's session and RLS (admin-only insert policy), and
// the creator and timestamp are the audit (who/when). The post-meeting rule
// — no amount before the booking's end time has passed, none on a cancelled
// booking — is enforced in Postgres (schemas/manual_amounts.sql) and mapped
// to its message here.

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

// Postgres raises P0001 from the post-meeting trigger; everything else —
// a booking that vanished in between, a dropped connection — is the
// generic failure.
const POST_MEETING_VIOLATION = "P0001";

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
    return {
      error:
        error.code === POST_MEETING_VIOLATION
          ? copy.errors.tooEarly
          : copy.errors.addFailed,
      status: "error",
    };
  }
  revalidatePath("/admin/bookings");
  return { status: "success" };
}
