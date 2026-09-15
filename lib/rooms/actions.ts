"use server";

// Admin room mutations (issue #3). Server Actions, zod-parsed on the server
// with the same schema the form used (docs/agents/ui.md). Every write goes
// through the user session; RLS policies make these admin-only. Money: whole
// kroner in, integer øre stored (ADR-0019).

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
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

// Insert a room row and return its id, or a failure. Both save paths share
// it; create passes the client-chosen id in the row (the storage path needs
// it before the row exists).
async function insertRoomRow(
  supabase: SupabaseClient<Database>,
  row: Database["public"]["Tables"]["rooms"]["Insert"]
): Promise<{ roomId: string } | ActionFailure> {
  const { data, error } = await supabase
    .from("rooms")
    .insert(row)
    .select("room_id")
    .single();
  if (error || !data) {
    return FAIL_SAVE;
  }
  return { roomId: data.room_id };
}

// Update the room row when the id exists; otherwise insert a new one.
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
    return error ? FAIL_SAVE : { roomId: values.roomId };
  }
  return insertRoomRow(supabase, roomValues);
}

// Create with a client-chosen id (create mode uploads images before the
// room exists). Keep this separate from saveRoomRow: distinguishing insert
// from update on roomId presence alone is fragile.
function saveCreateRoomRow(
  supabase: SupabaseClient<Database>,
  values: RoomFormValues,
  roomValues: Database["public"]["Tables"]["rooms"]["Insert"]
): Promise<{ roomId: string } | ActionFailure> {
  if (!values.roomId) {
    return Promise.resolve(FAIL_SAVE);
  }
  return insertRoomRow(supabase, { ...roomValues, room_id: values.roomId });
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

// The first free sort order for this batch, or a failure: the cap rejects
// when saved photos plus this batch exceed ROOM_IMAGE_MAX_FILES. The client
// counts both too, but the server is the boundary.
type ImageSlot = { base: number; status: "ok" } | ActionFailure;

async function firstFreeSortOrder(
  supabase: SupabaseClient<Database>,
  roomId: string,
  incoming: number
): Promise<ImageSlot> {
  const { count, error } = await supabase
    .from("room_images")
    .select("room_image_id", { count: "exact", head: true })
    .eq("room_image_room_id", roomId);
  if (error) {
    return FAIL_IMAGE;
  }
  const base = count ?? 0;
  if (base + incoming > ROOM_IMAGE_MAX_FILES) {
    return { error: messages.rooms.errors.imageMaxCount, status: "error" };
  }
  return { base, status: "ok" };
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
  const slot = await firstFreeSortOrder(supabase, roomId, images.length);
  if (slot.status === "error") {
    return slot;
  }

  const { error } = await supabase.from("room_images").insert(
    images.map((image, index) => ({
      room_image_file_name: image.fileName,
      room_image_file_size: image.sizeBytes,
      room_image_room_id: roomId,
      room_image_sort_order: slot.base + index,
      room_image_storage_path: image.path,
    }))
  );
  return error ? FAIL_IMAGE : null;
}

// The room row, with create mode inserting the client-chosen id (see
// saveCreateRoomRow).
function saveRoomRowFor(
  supabase: SupabaseClient<Database>,
  isNew: boolean,
  values: RoomFormValues,
  roomValues: Database["public"]["Tables"]["rooms"]["Insert"]
): Promise<{ roomId: string } | ActionFailure> {
  return isNew
    ? saveCreateRoomRow(supabase, values, roomValues)
    : saveRoomRow(supabase, values, roomValues);
}

// The first validation message, if any.
function firstIssueMessage(error: z.ZodError): string | undefined {
  return error.issues[0]?.message;
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
    return { error: firstIssueMessage(images.error), status: "error" };
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

  const saved = await saveRoomRowFor(supabase, isNew, values, roomValues);
  if (!("roomId" in saved)) {
    return saved;
  }

  const outcome = await writeRoomChildren(
    supabase,
    saved.roomId,
    values,
    images.data
  );
  if (outcome) {
    return outcome;
  }

  revalidateRooms();
  return { roomId: saved.roomId, status: "success" };
}

// The writes after the room row: weekly hours, add-on selection, image
// rows. Each is replace-style, so a retry after a mid-sequence failure
// converges; the first failure short-circuits the save (sequential on
// purpose — later writes key on the earlier ones).
async function writeRoomChildren(
  supabase: SupabaseClient<Database>,
  roomId: string,
  values: RoomFormValues,
  images: RoomImageUpload[]
): Promise<ActionFailure | null> {
  const hours = await replaceWeeklyHours(supabase, roomId, values);
  if (hours) {
    return hours;
  }
  const addons = await replaceRoomAddons(supabase, roomId, values.addonIds);
  if (addons) {
    return addons;
  }
  return recordImages(supabase, roomId, images);
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

// Remove the storage object for a saved image, then its row: an orphaned
// object is harmless, a dangling path is not. Returns the failure, if any.
async function deleteImageAsset(
  supabase: SupabaseClient<Database>,
  roomImageId: string
): Promise<ActionFailure | null> {
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
  return removeError ? FAIL_IMAGE : null;
}

// Delete a saved room image: storage bytes first, then the referencing row.
export async function deleteRoomImage(
  roomImageId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const assetFailure = await deleteImageAsset(supabase, roomImageId);
  if (assetFailure) {
    return assetFailure;
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
// The room's saved image ids, or null when the read fails.
async function fetchRoomImageIds(
  supabase: SupabaseClient<Database>,
  roomId: string
): Promise<string[] | null> {
  const { data: images, error } = await supabase
    .from("room_images")
    .select("room_image_id")
    .eq("room_image_room_id", roomId);
  if (error || !images) {
    return null;
  }
  return images.map((image) => image.room_image_id);
}

// The id list must be a permutation of the saved ids: no missing, unknown,
// or duplicate entries.
function isPermutationOfSaved(saved: string[], ids: string[]): boolean {
  const existing = new Set(saved);
  return (
    ids.length === saved.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => existing.has(id))
  );
}

// Validate the sent order against the saved rows; a failure short-circuits.
async function assertReorderable(
  supabase: SupabaseClient<Database>,
  roomId: string,
  orderedRoomImageIds: string[]
): Promise<ActionFailure | null> {
  const parsed = roomImageOrderSchema.safeParse(orderedRoomImageIds);
  if (!parsed.success) {
    return FAIL_IMAGE;
  }
  const saved = await fetchRoomImageIds(supabase, roomId);
  if (!(saved && isPermutationOfSaved(saved, parsed.data))) {
    return FAIL_IMAGE;
  }
  return null;
}

// One phase of the renumber: write every row's sort order in parallel.
// False when any write failed.
async function writeSortOrders(
  supabase: SupabaseClient<Database>,
  ids: string[],
  offset: number
): Promise<boolean> {
  const results = await Promise.all(
    ids.map(async (roomImageId, index) => {
      const { error } = await supabase
        .from("room_images")
        .update({ room_image_sort_order: offset + index })
        .eq("room_image_id", roomImageId);
      return error === null;
    })
  );
  return results.every((ok) => ok);
}

export async function reorderRoomImages(
  roomId: string,
  orderedRoomImageIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const invalid = await assertReorderable(
    supabase,
    roomId,
    orderedRoomImageIds
  );
  if (invalid) {
    return invalid;
  }
  // Phase 1 moves every row out of the real range, phase 2 writes the final
  // order — sequential on purpose, since the unique constraint on (room,
  // sort_order) rejects a swap's in-between state.
  const movedAside = await writeSortOrders(
    supabase,
    orderedRoomImageIds,
    SORT_ORDER_OFFSET
  );
  if (!movedAside) {
    return FAIL_IMAGE;
  }
  const written = await writeSortOrders(supabase, orderedRoomImageIds, 0);
  if (!written) {
    return FAIL_IMAGE;
  }

  revalidateRooms();
  return { status: "success" };
}
// A closed day carries no times; an open day needs both.
function specialDayTimes(values: SpecialClosingDayValues): {
  closes: string | null;
  opens: string | null;
} {
  return values.isClosed
    ? { closes: null, opens: null }
    : { closes: values.closes, opens: values.opens };
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
  const times = specialDayTimes(parsed.data);
  const { error } = await supabase.from("room_special_closing_days").upsert(
    {
      room_special_closing_day_closes: times.closes,
      room_special_closing_day_date: parsed.data.date,
      room_special_closing_day_is_closed: parsed.data.isClosed,
      room_special_closing_day_opens: times.opens,
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
