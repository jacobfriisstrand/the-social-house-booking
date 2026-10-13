// The Outlook mirror worker (#13, ADR-0003, docs/agents/outlook-sync.md):
// drains calendar_events of the rows its triggers marked
// calendar_event_needs_sync and pushes each one to Microsoft Graph through
// the injected client. One Graph entry per mirror row, updated in place; a
// cancelled/expired booking or a tombstoned row (hard-deleted source)
// removes the Graph entry and the row itself. Outlook is never read back —
// the only mirror of reality is calendar_events.
//
// Runs without a session, so the job route passes its service-role client
// in (allowlist entry 9 in docs/agents/supabase.md). Rows are processed one
// at a time ("single writer, serialized per entry"): the claim is a
// conditional update that returns the row WITH ITS CURRENT source data —
// never the batch's stale snapshot, so an edit that lands while the batch
// waits keeps its dirty mark (the claim missed it) and is pushed next run.
// A failed call puts the flag back without touching the stored graph id, so
// the retry patches the entry it already has instead of creating a second
// one; a create whose write-back fails stores its new id the same way.
// Failed rows go to Sentry tagged with calendar_event_id and the run
// carries on with the next row, like the reminder job.
import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type GraphEventPayload,
  outlookBookingEvent,
  outlookHouseEvent,
} from "@/lib/domain/outlook-event";
import type { GraphClient } from "@/lib/outlook/graph";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface CalendarSyncRun {
  created: number;
  failed: number;
  removed: number;
  updated: number;
}

// Per-run maximum. ponytail: the real limiter is the time budget below —
// the count cap only bounds a pathological queue; raising throughput means
// raising the budget, not this number.
const BATCH_SIZE = 100;

// ponytail: the job route is a standard Netlify function at the platform's
// default execution limit (docs/vendor/netlify records no number — verify
// in the Netlify UI before raising the budget); the budget stops cleanly
// inside it, so rows that do not fit stay dirty for the next run instead of
// dying mid-flight. If syncs lag, split the work or move the worker into a
// longer-lived runtime — not into a bigger budget.
const TIME_BUDGET_MS = 8000;

const MIRROR_SELECT = `
  calendar_event_graph_event_id, calendar_event_id,
  bookings ( booking_booker_email, booking_booker_name, booking_booker_phone,
    booking_number, booking_participant_count, booking_reference,
    booking_start_at, booking_end_at, booking_status,
    companies ( company_display_name ), rooms ( room_name ) ),
  house_events ( house_event_description, house_event_end_at,
    house_event_start_at, house_event_title,
    house_event_rooms ( rooms ( room_name ) ) )`;

async function dirtyIds(client: Client) {
  const rows = await client
    .from("calendar_events")
    .select("calendar_event_id")
    .eq("calendar_event_needs_sync", true)
    .order("calendar_event_id")
    .limit(BATCH_SIZE);
  if (rows.error) {
    throw new Error(
      `could not read dirty calendar events: ${rows.error.message}`
    );
  }
  return rows.data;
}

// The single-writer lock: the conditional update only goes through for a
// row still marked dirty, and returns that row with its source data read at
// claim time.
async function claimedRow(client: Client, calendarEventId: string) {
  const claimed = await client
    .from("calendar_events")
    .update({
      calendar_event_needs_sync: false,
      calendar_event_updated_at: new Date().toISOString(),
    })
    .eq("calendar_event_id", calendarEventId)
    .eq("calendar_event_needs_sync", true)
    .select(MIRROR_SELECT);
  if (claimed.error) {
    throw new Error(`could not claim calendar event: ${claimed.error.message}`);
  }
  return claimed.data[0] ?? null;
}

// A failed row goes back into the queue for the next run. The stored graph
// id is never erased: a retry must patch the entry it already has, never
// create a second one. A freshly created id is stored here when the
// write-back after a create failed.
async function reclaim(
  client: Client,
  row: {
    calendar_event_id: string;
    calendar_event_graph_event_id: string | null;
  },
  createdGraphEventId?: string
): Promise<void> {
  await client
    .from("calendar_events")
    .update({
      calendar_event_needs_sync: true,
      ...(createdGraphEventId
        ? { calendar_event_graph_event_id: createdGraphEventId }
        : {}),
    })
    .eq("calendar_event_id", row.calendar_event_id);
}

async function markSynced(
  client: Client,
  row: { calendar_event_id: string },
  graphEventId: string
): Promise<void> {
  const now = new Date().toISOString();
  const synced = await client
    .from("calendar_events")
    .update({
      calendar_event_graph_event_id: graphEventId,
      calendar_event_last_synced_at: now,
      calendar_event_updated_at: now,
    })
    .eq("calendar_event_id", row.calendar_event_id);
  if (synced.error) {
    throw new Error(
      `could not store the graph event id: ${synced.error.message}`
    );
  }
}

// Only a still-claimed row may be forgotten: if a write re-marked the row
// mid-flight, the delete must leave it for the next run, which then reads
// its fresh state.
async function forget(
  client: Client,
  row: { calendar_event_id: string }
): Promise<void> {
  const removed = await client
    .from("calendar_events")
    .delete()
    .eq("calendar_event_id", row.calendar_event_id)
    .eq("calendar_event_needs_sync", false);
  if (removed.error) {
    throw new Error(
      `could not forget calendar event: ${removed.error.message}`
    );
  }
}

type ClaimedRow = NonNullable<Awaited<ReturnType<typeof claimedRow>>>;

// Null when the row has nothing left to mirror: a tombstone (both sources
// gone) or a booking that is no longer confirmed.
function payloadOf(row: ClaimedRow): GraphEventPayload | null {
  const booking = row.bookings;
  if (booking) {
    return booking.booking_status === "confirmed"
      ? outlookBookingEvent({
          bookerEmail: booking.booking_booker_email,
          bookerName: booking.booking_booker_name,
          bookerPhone: booking.booking_booker_phone,
          bookingNumber: booking.booking_number,
          companyDisplayName: booking.companies?.company_display_name ?? "",
          endAt: booking.booking_end_at,
          participantCount: booking.booking_participant_count,
          reference: booking.booking_reference,
          roomName: booking.rooms?.room_name ?? "",
          startAt: booking.booking_start_at,
        })
      : null;
  }
  const houseEvent = row.house_events;
  return houseEvent
    ? outlookHouseEvent({
        description: houseEvent.house_event_description,
        endAt: houseEvent.house_event_end_at,
        roomNames: (houseEvent.house_event_rooms ?? []).map(
          (line) => line.rooms?.room_name ?? ""
        ),
        startAt: houseEvent.house_event_start_at,
        title: houseEvent.house_event_title,
      })
    : null;
}

type Outcome = "created" | "removed" | "updated";

async function pushRow(
  client: Client,
  graph: GraphClient,
  row: ClaimedRow
): Promise<Outcome> {
  const payload = payloadOf(row);
  const graphEventId = row.calendar_event_graph_event_id;

  if (!payload) {
    if (graphEventId) {
      await graph.deleteEvent(graphEventId);
    }
    await forget(client, row);
    return "removed";
  }

  if (graphEventId) {
    const stillThere = await graph.updateEvent(graphEventId, payload);
    if (stillThere) {
      await markSynced(client, row, graphEventId);
      return "updated";
    }
    // The entry was deleted in Outlook; create it again under a new id so
    // the same source never shows twice.
  }
  // Any path that reaches createEvent — no id yet, or a 404 on the old one
  // — created an entry in Outlook.
  const createdId = await graph.createEvent(payload);
  try {
    await markSynced(client, row, createdId);
  } catch (error) {
    // The entry exists in Outlook but the id never landed: store it in the
    // reclaim so the next run patches this entry instead of duplicating it.
    // ponytail: a crash between the create and this write duplicates the
    // entry once; upgrade: look the entry up by iCalUId before creating.
    await reclaim(client, row, createdId);
    throw error;
  }
  return "created";
}

export async function syncCalendarEvents(
  client: Client,
  graph: GraphClient
): Promise<CalendarSyncRun> {
  const ids = await dirtyIds(client);
  const run: CalendarSyncRun = {
    created: 0,
    failed: 0,
    removed: 0,
    updated: 0,
  };
  const stopAt = Date.now() + TIME_BUDGET_MS;

  for (const { calendar_event_id: id } of ids) {
    if (Date.now() >= stopAt) {
      break;
    }
    // biome-ignore lint/performance/noAwaitInLoops: Graph calls and the row claim go out one at a time on purpose — the mirror is a single serialized writer (ADR-0003).
    const row = await claimedRow(client, id);
    if (!row) {
      continue;
    }
    try {
      const outcome = await pushRow(client, graph, row);
      run[outcome] += 1;
    } catch (error) {
      await reclaim(client, row);
      run.failed += 1;
      captureException(error, {
        tags: { calendar_event_id: row.calendar_event_id },
      });
    }
  }
  return run;
}
