// Read-side for the admin add-on catalogue (#7). Session client + RLS —
// the admin layout guards the routes, the policies guard the rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface AddonDetail {
  addonId: string;
  description: string | null;
  isActive: boolean;
  name: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

// Every add-on, in display order (sort order first, then name) — the same
// order the booking flow shows the active ones in.
export async function listAddonDetails(
  supabase: SupabaseClient<Database>
): Promise<AddonDetail[]> {
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .order("addon_sort_order", { ascending: true, nullsFirst: false })
    .order("addon_name");
  if (error) {
    throw new Error(`could not list add-ons: ${error.message}`);
  }
  return data.map((addon) => ({
    addonId: addon.addon_id,
    description: addon.addon_description,
    isActive: addon.addon_is_active,
    name: addon.addon_name,
    priceOre: addon.addon_price_ore,
    pricingModel: addon.addon_pricing_model,
  }));
}
