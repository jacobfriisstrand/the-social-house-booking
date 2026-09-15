// Read-side for the admin room screens (#3). Session client + RLS — the
// admin layout guards the routes, the policies guard the rows.

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type OpeningHourRow =
  Database["public"]["Tables"]["room_opening_hours"]["Row"];
export type SpecialClosingDayRow =
  Database["public"]["Tables"]["room_special_closing_days"]["Row"];

export interface RoomDetail {
  addonIds: string[];
  capacity: number;
  description: string | null;
  hourlyPriceOre: number;
  images: Array<{
    fileName: string;
    fileSizeBytes: number;
    roomImageId: string;
    storagePath: string;
    url: string;
  }>;
  isActive: boolean;
  location: string | null;
  name: string;
  openingHours: OpeningHourRow[];
  practicalNotes: string | null;
  roomId: string;
  specialDays: SpecialClosingDayRow[];
}

export interface AddonOption {
  addonId: string;
  name: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

// Public URL for a storage path — room-images is a public bucket
// (migration 20260910170748_room_images_bucket.sql).
export function roomImageUrl(
  supabase: SupabaseClient<Database>,
  path: string
): string {
  return supabase.storage.from("room-images").getPublicUrl(path).data.publicUrl;
}

// Unwrap a list query: a failed query must throw — swallowing it would
// render incomplete rooms (missing hours would show as closed days, and an
// admin save would then wipe the real rows).
function queryRows<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  what: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${what}: ${result.error.message}`);
  }
  return result.data ?? [];
}

// Full detail for every room, for the admin page and its edit sheets: the
// room rows plus the per-room tables in bulk (five queries for the whole
// list, not five per room).
export async function listRoomDetails(
  supabase: SupabaseClient<Database>
): Promise<RoomDetail[]> {
  const [roomsResult, imagesResult, hoursResult, daysResult, linksResult] =
    await Promise.all([
      supabase.from("rooms").select("*").order("room_name"),
      supabase.from("room_images").select("*").order("room_image_sort_order"),
      supabase
        .from("room_opening_hours")
        .select("*")
        .order("room_opening_hour_day_of_week"),
      supabase
        .from("room_special_closing_days")
        .select("*")
        .order("room_special_closing_day_date"),
      supabase.from("room_addons").select("*"),
    ]);

  const rooms = queryRows(roomsResult, "rooms");
  const images = queryRows(imagesResult, "room images");
  const hours = queryRows(hoursResult, "opening hours");
  const specialDays = queryRows(daysResult, "special closing days");
  const links = queryRows(linksResult, "room add-on links");

  return rooms.map((room) => ({
    addonIds: links
      .filter((link) => link.room_addon_room_id === room.room_id)
      .map((link) => link.room_addon_addon_id),
    capacity: room.room_capacity,
    description: room.room_description,
    hourlyPriceOre: room.room_hourly_price_ore,
    images: images
      .filter((image) => image.room_image_room_id === room.room_id)
      .map((image) => ({
        fileName: image.room_image_file_name,
        fileSizeBytes: image.room_image_file_size,
        roomImageId: image.room_image_id,
        storagePath: image.room_image_storage_path,
        url: roomImageUrl(supabase, image.room_image_storage_path),
      })),
    isActive: room.room_is_active,
    location: room.room_location,
    name: room.room_name,
    openingHours: hours.filter(
      (hour) => hour.room_opening_hour_room_id === room.room_id
    ),
    practicalNotes: room.room_practical_notes,
    roomId: room.room_id,
    specialDays: specialDays.filter(
      (day) => day.room_special_closing_day_room_id === room.room_id
    ),
  }));
}

export async function listAddons(
  supabase: SupabaseClient<Database>
): Promise<AddonOption[]> {
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .order("addon_name");
  if (error) {
    throw new Error(`could not list add-ons: ${error.message}`);
  }
  return data.map((addon) => ({
    addonId: addon.addon_id,
    name: addon.addon_name,
    priceOre: addon.addon_price_ore,
    pricingModel: addon.addon_pricing_model,
  }));
}
