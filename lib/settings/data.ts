// Read-side for the site settings: the Wi-Fi credentials the shell footer
// shows (DESIGN.md). Session client + RLS — every logged-in viewer reads.
// Until a first admin save (cloud projects get no seed) the footer falls
// back to the copy in messages/da.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { messages } from "@/messages/da";

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
