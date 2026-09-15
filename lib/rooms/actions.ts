"use server";

// Admin room mutations (issue #3). Server Actions, zod-parsed on the server
// with the same schema the form used (docs/agents/ui.md). Every write goes
// through the user session; RLS policies make these admin-only. Money: whole
// kroner in, integer øre stored (ADR-0019).

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  ROOM_IMAGE_MAX_FILES,
  type RoomFormValues,
  type RoomImageUpload,
  roomImageOrderSchema,
  roomImageUploadsSchema,
  type SpecialClosingDayValues,
  specialClosingDaySchema,
} from "@/lib/validation/rooms";
import { messages } from "@/messages/da";

export type RoomFormState =
  | { status: "idle" }
  | { status: "success"; roomId: string }
  | {
      status: "error";
      error?: string;
      fieldErrors?: Record<string, string[]>;
    };

export type ActionResult =
  | { status: "success" }
  | { status: "error"; error: string };

// Client state for useActionState actions: idle until the first dispatch.
export type ActionFormState = { status: "idle" } | ActionResult;

interface ActionFailure {
  error: string;
  status: "error";
}

const STORAGE_BUCKET = "room-images";

const FAIL_SAVE: ActionFailure = {
  error: messages.rooms.saveFailed,
  status: "error",
};
const FAIL_IMAGE: ActionFailure = {
  error: messages.rooms.imageActionFailed,
  status: "error",
};

// One special closing day (lukkedag): a closed day carries no times; an
// open day needs both times, closes after opens (mirrors the check
// constraint on room_special_closing_days). The schema lives in
// lib/validation/rooms.ts — "use server" files may only export async
// functions.

function orNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function revalidateRooms(): void {
  revalidatePath("/admin/rooms");
}

// Insert or update the room row; returns the room id on success.
// isNew carries a client-generated roomId (the storage path needs it before
// the row exists), so the insert includes it explicitly.
async function saveRoomRow(
  supabase: SupabaseClient<Database>,
  values: RoomFormValues,
  roomValues: Database["public"]["Tables"]["rooms"]["Insert"]
): Promise<{ roomId: string } | ActionFailure> {
  if (values.roomId) {
    const { error } = await supabase
      .from("rooms")
      .update(roomValues)
      .eq("room_id", values.roomId);
    if (error) {
      return FAIL_SAVE;
    }
    return { roomId: values.roomId };
  }
  const { data, error } = await supabase
    .from("rooms")
    .insert(roomValues)
    .select("room_id")
    .single();
  if (error || !data) {
    return FAIL_SAVE;
  }
  return { roomId: data.room_id };
}

// Create with a client-chosen id (create mode uploads images before the
// room exists). Keep this separate from saveRoomRow: distinguishing insert
// from update on roomId presence alone is fragile.
async function saveCreateRoomRow(
  supabase: SupabaseClient<Database>,
  values: RoomFormValues,
  roomValues: Database["public"]["Tables"]["rooms"]["Insert"]
): Promise<{ roomId: string } | ActionFailure> {
  if (!values.roomId) {
    return FAIL_SAVE;
  }
  const { data, error } = await supabase
    .from("rooms")
    .insert({ ...roomValues, room_id: values.roomId })
    .select("room_id")
    .single();
  if (error || !data) {
    return FAIL_SAVE;
  }
  return { roomId: data.room_id };
}

// Replace the room's seven weekly rows (unique per room + day).
async function replaceWeeklyHours(
  supabase: SupabaseClient<Database>,
  roomId: string,
  values: RoomFormValues
): Promise<ActionFailure | null> {
  const { error: deleteError } = await supabase
    .from("room_opening_hours")
    .delete()
    .eq("room_opening_hour_room_id", roomId);
  if (deleteError) {
    return FAIL_SAVE;
  }
  const { error } = await supabase.from("room_opening_hours").insert(
    values.openingHours.map((hour) => ({
      room_opening_hour_closes: hour.closes,
      room_opening_hour_day_of_week: hour.dayOfWeek,
      room_opening_hour_is_closed: hour.isClosed,
      room_opening_hour_opens: hour.opens,
      room_opening_hour_room_id: roomId,
    }))
  );
  if (error) {
    return FAIL_SAVE;
  }
  return null;
}

// Add-on selection: replace the room's set.
async function replaceRoomAddons(
  supabase: SupabaseClient<Database>,
  roomId: string,
  addonIds: string[]
): Promise<ActionFailure | null> {
  const { error: deleteError } = await supabase
    .from("room_addons")
    .delete()
    .eq("room_addon_room_id", roomId);
  if (deleteError) {
    return FAIL_SAVE;
  }
  if (addonIds.length === 0) {
    return null;
  }
  const { error } = await supabase.from("room_addons").insert(
    addonIds.map((addonId) => ({
      room_addon_addon_id: addonId,
      room_addon_room_id: roomId,
    }))
  );
  if (error) {
    return FAIL_SAVE;
  }
  return null;
}

// Record pre-uploaded images (client upload strategy): the client sent the
// bytes to storage, the action only writes the referencing rows with the
// original file name and size shown in the admin form. The bucket enforces
// mime + size; the action validates the path shape and the total count —
// the cap covers saved photos plus this batch, so a room can never exceed
// 10 images no matter which client sent them.
async function recordImages(
  supabase: SupabaseClient<Database>,
  roomId: string,
  images: RoomImageUpload[]
): Promise<ActionFailure | null> {
  if (images.length === 0) {
    return null;
  }
  const { count, error: countError } = await supabase
    .from("room_images")
    .select("room_image_id", { count: "exact", head: true })
    .eq("room_image_room_id", roomId);
  if (countError) {
    return FAIL_IMAGE;
  }
  if ((count ?? 0) + images.length > ROOM_IMAGE_MAX_FILES) {
    return { error: messages.rooms.errors.imageMaxCount, status: "error" };
  }

  const { error } = await supabase.from("room_images").insert(
    images.map((image, index) => ({
      room_image_file_name: image.fileName,
      room_image_file_size: image.sizeBytes,
      room_image_room_id: roomId,
      room_image_sort_order: (count ?? 0) + index,
      room_image_storage_path: image.path,
    }))
  );
  return error ? FAIL_IMAGE : null;
}

// Create or update a room with all fields (Bilag 1): basic info, price,
// weekly opening hours, add-on selection, and routes for the images the
// client already uploaded to storage.
//
// isNew is explicit because create mode now carries a client-generated
// roomId (needed for the storage path before the room exists).
export async function saveRoom(
  _previousState: RoomFormState,
  payload: {
    images: RoomImageUpload[];
    isNew: boolean;
    values: RoomFormValues;
  }
): Promise<RoomFormState> {
  const { isNew, values } = payload;

  const images = roomImageUploadsSchema.safeParse(payload.images);
  if (!images.success) {
    return { error: images.error.issues[0]?.message, status: "error" };
  }

  const supabase = await createClient();

  const roomValues = {
    room_capacity: values.capacity,
    room_description: orNull(values.description),
    // Whole kroner in, integer øre stored (ADR-0019).
    room_hourly_price_ore: values.hourlyPriceKroner * 100,
    room_is_active: values.isActive,
    room_location: orNull(values.location),
    room_name: values.name,
    room_practical_notes: orNull(values.practicalNotes),
    room_updated_at: new Date().toISOString(),
  };

  const saved = isNew
    ? await saveCreateRoomRow(supabase, values, roomValues)
    : await saveRoomRow(supabase, values, roomValues);
  if (!("roomId" in saved)) {
    return saved;
  }
  const { roomId } = saved;

  const hoursOutcome = await replaceWeeklyHours(supabase, roomId, values);
  if (hoursOutcome) {
    return hoursOutcome;
  }
  const addonsOutcome = await replaceRoomAddons(
    supabase,
    roomId,
    values.addonIds
  );
  if (addonsOutcome) {
    return addonsOutcome;
  }
  const imagesOutcome = await recordImages(supabase, roomId, images.data);
  if (imagesOutcome) {
    return imagesOutcome;
  }

  revalidateRooms();
  return { roomId, status: "success" };
}

// Deactivate without losing history: bookings keep referencing the room by
// id; the room disappears from booking and search only (#3).
export async function setRoomActive(
  roomId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      room_is_active: isActive,
      room_updated_at: new Date().toISOString(),
    })
    .eq("room_id", roomId);
  if (error) {
    return { error: messages.rooms.activateFailed, status: "error" };
  }
  revalidateRooms();
  return { status: "success" };
}

// Delete the storage object first: an orphaned object is harmless, a
// dangling path is not.
export async function deleteRoomImage(
  roomImageId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: image, error: fetchError } = await supabase
    .from("room_images")
    .select("room_image_storage_path")
    .eq("room_image_id", roomImageId)
    .single();
  if (fetchError || !image) {
    return FAIL_IMAGE;
  }

  const { error: removeError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([image.room_image_storage_path]);
  if (removeError) {
    return FAIL_IMAGE;
  }
  const { error } = await supabase
    .from("room_images")
    .delete()
    .eq("room_image_id", roomImageId);
  if (error) {
    return FAIL_IMAGE;
  }

  revalidateRooms();
  return { status: "success" };
}

// Persist the display order of a room's saved images after a drag-and-drop
// reorder. The id list must match the room's images exactly — no missing,
// unknown, or duplicate ids — so a stale client cannot clobber concurrent
// changes. Writes 0…n-1 so every row gets a distinct sort order; the
// renumber runs in two phases (out of the way, then into place) because the
// unique constraint on (room, sort_order) rejects a swap's in-between state.
const SORT_ORDER_OFFSET = 1_000_000;

export async function reorderRoomImages(
  roomId: string,
  orderedRoomImageIds: string[]
): Promise<ActionResult> {
  const ordered = roomImageOrderSchema.safeParse(orderedRoomImageIds);
  if (!ordered.success) {
    return FAIL_IMAGE;
  }
  const supabase = await createClient();
  const { data: images, error } = await supabase
    .from("room_images")
    .select("room_image_id")
    .eq("room_image_room_id", roomId);
  if (error || !images) {
    return FAIL_IMAGE;
  }

  const existing = new Set(images.map((image) => image.room_image_id));
  const ids = ordered.data;
  if (
    ids.length !== images.length ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => existing.has(id))
  ) {
    return FAIL_IMAGE;
  }

  const writeOrders = (offset: number): Promise<boolean[]> =>
    Promise.all(
      ids.map(async (roomImageId, index) => {
        const { error: updateError } = await supabase
          .from("room_images")
          .update({ room_image_sort_order: offset + index })
          .eq("room_image_id", roomImageId);
        return updateError === null;
      })
    );

  const movedAside = await writeOrders(SORT_ORDER_OFFSET);
  if (movedAside.includes(false)) {
    return FAIL_IMAGE;
  }
  const written = await writeOrders(0);
  if (written.includes(false)) {
    return FAIL_IMAGE;
  }

  revalidateRooms();
  return { status: "success" };
}

// useActionState signature (docs/agents/ui.md): the caller dispatches the
// payload; toasts fire on the returned state in the client.
export async function saveSpecialClosingDay(
  _previousState: ActionFormState,
  payload: { roomId: string; values: SpecialClosingDayValues }
): Promise<ActionFormState> {
  const parsed = specialClosingDaySchema.safeParse(payload.values);
  if (!parsed.success) {
    return { error: messages.rooms.errors.closesAfterOpens, status: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("room_special_closing_days").upsert(
    {
      room_special_closing_day_closes: parsed.data.isClosed
        ? null
        : parsed.data.closes,
      room_special_closing_day_date: parsed.data.date,
      room_special_closing_day_is_closed: parsed.data.isClosed,
      room_special_closing_day_opens: parsed.data.isClosed
        ? null
        : parsed.data.opens,
      room_special_closing_day_room_id: payload.roomId,
    },
    {
      onConflict:
        "room_special_closing_day_room_id,room_special_closing_day_date",
    }
  );
  if (error) {
    return { error: messages.rooms.saveFailed, status: "error" };
  }

  revalidateRooms();
  return { status: "success" };
}

export async function deleteSpecialClosingDay(
  _previousState: ActionFormState,
  roomSpecialClosingDayId: string
): Promise<ActionFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("room_special_closing_days")
    .delete()
    .eq("room_special_closing_day_id", roomSpecialClosingDayId);
  if (error) {
    return { error: messages.rooms.specialDayDeleteFailed, status: "error" };
  }
  revalidateRooms();
  return { status: "success" };
}
