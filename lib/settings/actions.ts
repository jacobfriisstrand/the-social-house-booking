"use server";

// Admin edit of the site settings — the Wi-Fi credentials the shell footer
// shows. The single row upserts (settings.setting_id is fixed to 1), so a
// fresh cloud project self-materializes it on first save.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import {
  type PublicHeroImageValues,
  publicHeroImageSchema,
  type SettingsValues,
  SITE_IMAGE_BUCKET,
  settingsSchema,
} from "@/lib/validation/settings";
import { messages } from "@/messages/da";
import { HERO_IMAGE_SLOT } from "./data";

export type SettingsState = FormState<SettingsValues>;
export type PublicHeroState = FormState<PublicHeroImageValues>;

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

// Save the public split-screen hero image (#89): the client has already
// uploaded the bytes into the site-images bucket; the action only swaps the
// pointer in site_images. The replaced object is removed best-effort — the
// pointer is authoritative and the orphaned bytes would be harmless
// (mirrors room-form's cleanup).
export async function updatePublicHeroImage(
  _prevState: PublicHeroState,
  values: PublicHeroImageValues
): Promise<PublicHeroState> {
  await requireAdmin();
  const parsed = publicHeroImageSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, messages.settings.errors.saveFailed);
  }

  const supabase = await createClient();
  const current = await supabase
    .from("site_images")
    .select("site_image_path")
    .eq("site_image_slot", HERO_IMAGE_SLOT)
    .maybeSingle();

  const saved = await supabase.from("site_images").upsert(
    {
      site_image_path: parsed.data.path,
      site_image_slot: HERO_IMAGE_SLOT,
      site_image_updated_at: new Date().toISOString(),
    },
    { onConflict: "site_image_slot" }
  );
  if (saved.error) {
    return { error: messages.settings.errors.saveFailed, status: "error" };
  }

  const oldPath = current.data?.site_image_path;
  if (oldPath && oldPath !== parsed.data.path) {
    await supabase.storage
      .from(SITE_IMAGE_BUCKET)
      .remove([oldPath])
      .catch(() => undefined);
  }

  // The public layout shows the photo on every public page.
  revalidatePath("/", "layout");
  return { status: "success" };
}
