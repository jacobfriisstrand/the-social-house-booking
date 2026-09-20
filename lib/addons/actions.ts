"use server";

// Admin add-on catalogue mutations (#7). Server Actions, zod-parsed on the
// server with the same schema the form used (docs/agents/ui.md). Every
// write goes through the user session; RLS policies make these admin-only.
// Money: whole kroner in, integer øre stored (ADR-0019).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type AddonFormValues, addonFormSchema } from "@/lib/validation/addons";
import { invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

export type AddonFormState =
  | { status: "idle" }
  | { addonId: string; status: "success" }
  | {
      error: string;
      fieldErrors?: Partial<Record<keyof AddonFormValues, string[]>>;
      status: "error";
    };

export type ActionResult =
  | { status: "success" }
  | { status: "error"; error: string };

const FAIL_SAVE = {
  error: messages.addons.errors.saveFailed,
  status: "error",
} as const;

function revalidateAddons(): void {
  revalidatePath("/admin/addons");
}

const toDatabase = (
  values: AddonFormValues
): {
  addon_description: string | null;
  addon_is_active: boolean;
  addon_name: string;
  addon_price_ore: number;
  addon_pricing_model: "fixed" | "per_participant";
} => ({
  addon_description: values.description || null,
  addon_is_active: values.isActive,
  addon_name: values.name,
  // Whole kroner in, integer øre stored (ADR-0019).
  addon_price_ore: values.priceKroner * 100,
  addon_pricing_model: values.pricingModel,
});

// Persist create-or-edit of a catalogue add-on (Bilag 1 "Add-ons"). Editing
// House Host's base price here changes every new booking's default (#7) —
// the per-booking adjustment lives on the booking_addons line, never here.
export async function saveAddon(
  _previousState: AddonFormState,
  values: AddonFormValues
): Promise<AddonFormState> {
  const parsed = addonFormSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<AddonFormValues>(
      parsed.error,
      messages.addons.errors.saveFailed
    );
  }
  const supabase = await createClient();
  const row = toDatabase(parsed.data);
  if (parsed.data.addonId) {
    const { error } = await supabase
      .from("addons")
      .update({ ...row, addon_updated_at: new Date().toISOString() })
      .eq("addon_id", parsed.data.addonId);
    if (error) {
      return FAIL_SAVE;
    }
    revalidateAddons();
    return { addonId: parsed.data.addonId, status: "success" };
  }
  const inserted = await supabase
    .from("addons")
    .insert(row)
    .select("addon_id")
    .single();
  if (inserted.error || !inserted.data) {
    return FAIL_SAVE;
  }
  revalidateAddons();
  return { addonId: inserted.data.addon_id, status: "success" };
}

// Deactivate/reactivate without deleting: bookings reference the add-on by
// id, and a deactivated add-on disappears from the booking flow only.
export async function setAddonActive(
  addonId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("addons")
    .update({
      addon_is_active: isActive,
      addon_updated_at: new Date().toISOString(),
    })
    .eq("addon_id", addonId);
  if (error) {
    return { error: messages.addons.errors.statusFailed, status: "error" };
  }
  revalidateAddons();
  return { status: "success" };
}

// Persist a drag-reorder of the catalogue (the Rækkefølge column): each
// add-on's sort order becomes its position (1-based) in the given id list.
// All rows are written before any revalidation, so a rejected reorder
// leaves the previous order intact. RLS keeps this admin-only.
export async function reorderAddons(
  orderedAddonIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedAddonIds.map(async (addonId, index) => {
      const { error } = await supabase
        .from("addons")
        .update({
          addon_sort_order: index + 1,
          addon_updated_at: new Date().toISOString(),
        })
        .eq("addon_id", addonId);
      return error;
    })
  );
  if (results.some(Boolean)) {
    return { error: messages.addons.errors.reorderFailed, status: "error" };
  }
  revalidateAddons();
  return { status: "success" };
}
