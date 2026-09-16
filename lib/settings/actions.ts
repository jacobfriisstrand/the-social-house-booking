"use server";

// Admin edit of the site settings — the Wi-Fi credentials the shell footer
// shows. The single row upserts (settings.setting_id is fixed to 1), so a
// fresh cloud project self-materializes it on first save.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { type SettingsValues, settingsSchema } from "@/lib/validation/settings";
import { messages } from "@/messages/da";

export type SettingsState = FormState<SettingsValues>;

export async function updateSettings(
  _prevState: SettingsState,
  values: SettingsValues
): Promise<SettingsState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, messages.settings.errors.saveFailed);
  }

  const supabase = await createClient();
  const upserted = await supabase.from("settings").upsert(
    {
      setting_id: 1,
      setting_updated_at: new Date().toISOString(),
      setting_wifi_network: parsed.data.wifiNetwork,
      setting_wifi_password: parsed.data.wifiPassword,
    },
    { onConflict: "setting_id" }
  );
  if (upserted.error) {
    return { error: messages.settings.errors.saveFailed, status: "error" };
  }

  // The footer shows the credentials on every shell page.
  revalidatePath("/", "layout");
  return { status: "success" };
}
