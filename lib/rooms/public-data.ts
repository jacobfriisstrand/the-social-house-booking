// Read-side for the member room screens (#4): the active rooms with what
// the cards, the detail page and the booking dialog show. Session client +
// RLS: rooms, images, opening hours and add-ons are member-readable.
import type { SupabaseClient } from "@supabase/supabase-js";
import { toSpecialDays, toWeekly } from "@/lib/bookings/availability";
import type {
  SpecialClosingDay,
  WeeklyOpeningHour,
} from "@/lib/domain/opening-hours";
import type { Database } from "@/lib/supabase/database.types";
import { type AddonOption, listAddons, listRoomDetails } from "./data";

export interface PublicAddon {
  addonId: string;
  description: string | null;
  name: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

export interface PublicRoom {
  addons: PublicAddon[];
  capacity: number;
  description: string | null;
  hourlyPriceOre: number;
  images: string[];
  location: string | null;
  name: string;
  practicalNotes: string | null;
  roomId: string;
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

const publicAddon = (addon: AddonOption): PublicAddon => ({
  addonId: addon.addonId,
  description: addon.description,
  name: addon.name,
  priceOre: addon.priceOre,
  pricingModel: addon.pricingModel,
});

export async function listPublicRooms(
  supabase: SupabaseClient<Database>
): Promise<PublicRoom[]> {
  const [rooms, addons] = await Promise.all([
    listRoomDetails(supabase),
    listAddons(supabase),
  ]);
  const activeAddons = addons.filter((addon) => addon.isActive);
  return rooms
    .filter((room) => room.isActive)
    .map((room) => ({
      addons: activeAddons
        .filter((addon) => room.addonIds.includes(addon.addonId))
        .map(publicAddon),
      capacity: room.capacity,
      description: room.description,
      hourlyPriceOre: room.hourlyPriceOre,
      images: room.images.map((image) => image.url),
      location: room.location,
      name: room.name,
      practicalNotes: room.practicalNotes,
      roomId: room.roomId,
      specialDays: toSpecialDays(room.specialDays),
      weekly: toWeekly(room.openingHours),
    }));
}

export async function findPublicRoom(
  supabase: SupabaseClient<Database>,
  roomId: string
): Promise<PublicRoom | null> {
  const rooms = await listPublicRooms(supabase);
  return rooms.find((room) => room.roomId === roomId) ?? null;
}

export interface RoomOption {
  capacity: number;
  name: string;
  roomId: string;
}

// The active rooms by name, for the search dialog's room select.
export async function listRoomOptions(
  supabase: SupabaseClient<Database>
): Promise<RoomOption[]> {
  const { data } = await supabase
    .from("rooms")
    .select("room_id, room_name, room_capacity")
    .eq("room_is_active", true)
    .order("room_name");
  return (data ?? []).map((room) => ({
    capacity: room.room_capacity,
    name: room.room_name,
    roomId: room.room_id,
  }));
}
