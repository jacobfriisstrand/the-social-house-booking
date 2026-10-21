// The admins behind the manual amounts' creator ids (#16): one lookup for
// the whole list, so every entry can show who added it. Admins are
// auth users, which PostgREST cannot embed, and the admin session may read
// the registry (policies/admins.sql). Read by the admin booking
// overview's rows (lib/bookings/admin-data.ts).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function adminDisplayNames(
  supabase: SupabaseClient<Database>,
  adminIds: readonly (string | null)[]
): Promise<Map<string, string>> {
  const known = [...new Set(adminIds.filter((id) => id !== null))];
  if (known.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase
    .from("admins")
    .select("admin_auth_user_id, admin_display_name")
    .in("admin_auth_user_id", known);
  if (error) {
    throw new Error(`could not list admins: ${error.message}`);
  }
  return new Map(
    data.map((admin) => [admin.admin_auth_user_id, admin.admin_display_name])
  );
}
