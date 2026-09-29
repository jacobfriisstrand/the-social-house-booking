"use server";

// House Event mutations (admin, #12). Server Actions, zod-parsed on the
// server with the same schema the form used (docs/agents/ui.md). Every
// write goes through the user session; RLS makes them admin-only.
//
// An event may not overlap a booking or another event, the 30-minute
// buffer included (decided in #12; Postgres enforces it through
// save_house_event and the room triggers). Before saving, the action looks
// the overlaps up so the admin sees which bookings are in the way; the
// database stays the final check if a booking lands in between.

import { revalidatePath } from "next/cache";
import { type Period, periodsCollide } from "@/lib/domain/availability";
import { bufferEndAt } from "@/lib/domain/buffer";
import { cphToUtc } from "@/lib/domain/time";
import { formatDate, formatTime } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type FormError, invalidFormState } from "@/lib/validation/form-state";
import {
  type HouseEventFormValues,
  houseEventFormSchema,
} from "@/lib/validation/house-events";
import { messages } from "@/messages/da";

const copy = messages.houseEvents;

// Postgres raises exclusion_violation from the room triggers.
const EXCLUSION_VIOLATION = "23P01";

/** One booking or House Event in the way, ready to show. */
export interface HouseEventConflict {
  entryId: string;
  name: string;
  roomName: string;
  when: string;
}

export type HouseEventFormState =
  | { status: "idle" }
  | { status: "success" }
  | { conflicts: HouseEventConflict[]; error: string; status: "conflict" }
  | FormError<HouseEventFormValues>;

export type ActionResult =
  | { status: "success" }
  | { status: "error"; error: string };

type Client = Awaited<ReturnType<typeof createClient>>;

function revalidateHouseEvents(): void {
  revalidatePath("/");
  revalidatePath("/admin/notices");
}

const when = ({ endAt, startAt }: Period): string =>
  `${formatDate(startAt)} ${formatTime(startAt)} - ${formatTime(endAt)}`;

type EntryRow = Pick<
  Database["public"]["Views"]["calendar_entries"]["Row"],
  | "calendar_entry_end_at"
  | "calendar_entry_id"
  | "calendar_entry_start_at"
  | "company_display_name"
  | "house_event_title"
  | "room_name"
>;

// A booking shows its company, an event its title or the plain label.
const entryName = (entry: EntryRow): string =>
  entry.company_display_name ??
  entry.house_event_title ??
  messages.home.houseEventBadge;

// The view's columns are nullable by construction; a row without times
// cannot collide.
function periodOf(entry: EntryRow): Period | null {
  const { calendar_entry_end_at: endAt, calendar_entry_start_at: startAt } =
    entry;
  return startAt && endAt
    ? { endAt: new Date(endAt), startAt: new Date(startAt) }
    : null;
}

// The entry as a conflict when its buffered period meets the event's.
function toConflicts(entry: EntryRow, period: Period): HouseEventConflict[] {
  const other = periodOf(entry);
  if (!(other && periodsCollide(period, other))) {
    return [];
  }
  return [
    {
      entryId: `${entry.calendar_entry_id}-${entry.room_name}`,
      name: entryName(entry),
      roomName: entry.room_name ?? "",
      when: when(other),
    },
  ];
}

// Live bookings and other events in the chosen rooms whose buffered period
// meets the event's buffered period. The window is widened by the buffer
// on the left; periodsCollide makes the exact call.
async function findConflicts(
  supabase: Client,
  period: Period,
  values: HouseEventFormValues
): Promise<HouseEventConflict[]> {
  const bufferMs =
    bufferEndAt(period.startAt).getTime() - period.startAt.getTime();
  const { data, error } = await supabase
    .from("calendar_entries")
    .select(
      "calendar_entry_id, calendar_entry_start_at, calendar_entry_end_at, room_name, company_display_name, house_event_title"
    )
    .in("room_id", values.roomIds)
    .neq("calendar_entry_id", values.houseEventId ?? "")
    .lt("calendar_entry_start_at", bufferEndAt(period.endAt).toISOString())
    .gt(
      "calendar_entry_end_at",
      new Date(period.startAt.getTime() - bufferMs).toISOString()
    )
    .order("calendar_entry_start_at");
  if (error) {
    throw new Error(
      `could not look up house event conflicts: ${error.message}`
    );
  }
  return data.flatMap((entry) => toConflicts(entry, period));
}

// Saves through save_house_event; null on success, else the message. A
// booking that lands between the lookup and the save trips the room
// triggers.
async function persist(
  supabase: Client,
  event: HouseEventFormValues,
  period: Period
): Promise<string | null> {
  const { error } = await supabase.rpc("save_house_event", {
    p_description: event.description,
    p_end_at: period.endAt.toISOString(),
    p_house_event_id: event.houseEventId,
    p_room_ids: event.roomIds,
    p_start_at: period.startAt.toISOString(),
    p_title: event.title || undefined,
  });
  if (!error) {
    return null;
  }
  return error.code === EXCLUSION_VIOLATION
    ? copy.errors.conflictRace
    : copy.errors.saveFailed;
}

export async function saveHouseEvent(
  _previousState: HouseEventFormState,
  values: HouseEventFormValues
): Promise<HouseEventFormState> {
  const parsed = houseEventFormSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<HouseEventFormValues>(
      parsed.error,
      copy.errors.saveFailed
    );
  }
  const event = parsed.data;
  const period = {
    endAt: cphToUtc(event.date, event.endTime),
    startAt: cphToUtc(event.date, event.startTime),
  };
  const supabase = await createClient();
  const conflicts = await findConflicts(supabase, period, event);
  if (conflicts.length > 0) {
    return { conflicts, error: copy.errors.conflict, status: "conflict" };
  }
  const failure = await persist(supabase, event, period);
  if (failure) {
    return { error: failure, status: "error" };
  }
  revalidateHouseEvents();
  return { status: "success" };
}

export async function deleteHouseEvent(
  houseEventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("house_events")
    .delete()
    .eq("house_event_id", houseEventId);
  if (error) {
    return { error: copy.errors.deleteFailed, status: "error" };
  }
  revalidateHouseEvents();
  return { status: "success" };
}
