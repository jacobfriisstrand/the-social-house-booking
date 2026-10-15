// Read-side for the site settings: the Wi-Fi credentials the shell footer
// shows (DESIGN.md). Session client + RLS — every logged-in viewer reads.
// Until a first admin save (cloud projects get no seed) the footer falls
// back to the copy in messages/da.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SITE_IMAGE_BUCKET } from "@/lib/validation/settings";
import { messages } from "@/messages/da";

// The hero slot of the site_images table (the public split-screen's photo,
// #89). Future public-image slots are rows here, not migrations.
export const HERO_IMAGE_SLOT = "hero";

export interface WifiSettings {
  network: string;
  password: string;
}

export async function getWifiSettings(
  supabase: SupabaseClient<Database>
): Promise<WifiSettings> {
  const { data } = await supabase
    .from("settings")
    .select("setting_wifi_network, setting_wifi_password")
    .limit(1)
    .maybeSingle();

  const row =
    data ??
    ({
      setting_wifi_network: messages.shell.footer.network,
      setting_wifi_password: messages.shell.footer.password,
    } as Pick<
      Database["public"]["Tables"]["settings"]["Row"],
      "setting_wifi_network" | "setting_wifi_password"
    >);

  return {
    network: row.setting_wifi_network,
    password: row.setting_wifi_password,
  };
}

// Read-side for the public hero image (#89): the path the admin saved in
// site_images (slot 'hero'), rendered by the public split-screen layout.
// Anonymous session + RLS — the select policy allows anon. Until a first
// admin save the layout falls back to the committed photo.
export async function getPublicHeroImage(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const { data } = await supabase
    .from("site_images")
    .select("site_image_path")
    .eq("site_image_slot", HERO_IMAGE_SLOT)
    .maybeSingle();
  return data?.site_image_path ?? null;
}

// Public URL for a storage path — site-images is a public bucket
// (migration 20261014203000_site_images_bucket.sql), like room-images.
export function publicHeroImageUrl(
  supabase: SupabaseClient<Database>,
  path: string
): string {
  return supabase.storage.from(SITE_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}
