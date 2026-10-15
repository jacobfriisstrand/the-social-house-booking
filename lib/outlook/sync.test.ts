import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { GraphClient } from "./graph";
import { syncCalendarEvents } from "./sync";

// The orchestration rules that live nowhere else: a row is claimed with its
// CURRENT data (never the batch's stale snapshot), a failed call puts the
// row back into the queue keeping its graph id (so a retry patches instead
// of creating a second entry), an Outlook deletion is answered by a new
// entry, and a hard-deleted source row removes the entry. The Supabase
// client is an in-memory fake standing in for the real one — the worker
// receives its collaborators as parameters, so the fake is the seam.
interface MirrorRow {
  bookings: Record<string, unknown> | null;
  calendar_event_graph_event_id: string | null;
  calendar_event_id: string;
  calendar_event_needs_sync: boolean;
  house_events: Record<string, unknown> | null;
  // The fake matches rows by arbitrary column names from the builder's eq().
  [column: string]: unknown;
}

// failUpdates makes the nth update call (1-based, claim included) fail with
// a database error, to drive the reclaim paths.
const fakeClient = (
  rows: MirrorRow[],
  failUpdates: number[] = []
): SupabaseClient<Database> => {
  let updateCount = 0;
  const client = {
    from: () => {
      const conditions: [string, unknown][] = [];
      let patch: Record<string, unknown> = {};
      let deleting = false;
      let failing = false;
      const matching = () =>
        rows.filter((row) =>
          conditions.every(([column, value]) => row[column] === value)
        );
      const apply = (row: MirrorRow): MirrorRow => {
        if (deleting) {
          rows.splice(rows.indexOf(row), 1);
          return row;
        }
        Object.assign(row, patch);
        return row;
      };
      const result = () =>
        failing
          ? { data: [], error: { message: "db down" } }
          : { data: matching().map((row) => ({ ...apply(row) })), error: null };
      const build = () => ({
        delete: () => {
          deleting = true;
          return build();
        },
        eq: (column: string, value: unknown) => {
          conditions.push([column, value]);
          return build();
        },
        limit: () => build(),
        order: () => build(),
        select: () => build(),
        // biome-ignore lint/suspicious/noThenProperty: the fake must be awaitable, like the real PostgREST builder it stands in for.
        then: (
          resolve: (result: {
            data: MirrorRow[];
            error: null | { message: string };
          }) => void
        ) => {
          resolve(result());
        },
        update: (values: Record<string, unknown>) => {
          updateCount += 1;
          failing = failUpdates.includes(updateCount);
          patch = values;
          return build();
        },
      });
      return build();
    },
  };
  return client as unknown as SupabaseClient<Database>;
};

const fakeGraph = (
  over: Partial<GraphClient> = {}
): GraphClient & {
  created: string[];
  deleted: string[];
  payloads: { showAs: string; subject: string }[];
} => {
  const created: string[] = [];
  const deleted: string[] = [];
  const payloads: { showAs: string; subject: string }[] = [];
  let nextId = 1;
  const graph = {
    createEvent: (payload: Parameters<GraphClient["createEvent"]>[0]) => {
      const id = `graph-${nextId}`;
      nextId += 1;
      created.push(id);
      payloads.push({ showAs: payload.showAs, subject: payload.subject });
      return Promise.resolve(id);
    },
    deleteEvent: (graphEventId: string) => {
      deleted.push(graphEventId);
      return Promise.resolve();
    },
    updateEvent: (
      _graphEventId: string,
      payload: Parameters<GraphClient["updateEvent"]>[1]
    ) => {
      payloads.push({ showAs: payload.showAs, subject: payload.subject });
      return Promise.resolve(true);
    },
    ...over,
    created,
    deleted,
    payloads,
  };
  return graph as GraphClient & typeof graph;
};

const bookingOf = (status: string): Record<string, unknown> => ({
  booking_booker_email: "peter@rituals.dk",
  booking_booker_name: "Peter",
  booking_booker_phone: "+45 2010 2030",
  booking_end_at: "2026-07-15T09:00:00Z",
  booking_number: "B-2607-0042",
  booking_participant_count: 8,
  booking_reference: null,
  booking_start_at: "2026-07-15T07:00:00Z",
  booking_status: status,
  companies: { company_display_name: "Rituals" },
  rooms: { room_name: "Room of Power" },
});

const mirrorRow = (
  id: string,
  needsSync: boolean,
  graphEventId: string | null,
  source: Partial<MirrorRow>
): MirrorRow => ({
  bookings: null,
  calendar_event_graph_event_id: graphEventId,
  calendar_event_id: id,
  calendar_event_needs_sync: needsSync,
  house_events: null,
  ...source,
});

describe("syncCalendarEvents", () => {
  it("claims each dirty row and stores the created graph id", async () => {
    const row = mirrorRow("r1", true, null, {
      bookings: bookingOf("confirmed"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run).toEqual({ created: 1, failed: 0, removed: 0, updated: 0 });
    expect(graph.created).toEqual(["graph-1"]);
    expect(graph.payloads).toEqual([
      { showAs: "busy", subject: "Room of Power · Rituals" },
    ]);
    expect(row.calendar_event_needs_sync).toBe(false);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("skips a row another run already claimed", async () => {
    const row = mirrorRow("r1", false, "graph-1", {
      bookings: bookingOf("confirmed"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.created).toBe(0);
    expect(graph.created).toHaveLength(0);
  });

  it("patches the same entry on a later change and keeps one id", async () => {
    const row = mirrorRow("r1", true, "graph-1", {
      bookings: bookingOf("confirmed"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.updated).toBe(1);
    expect(graph.created).toHaveLength(0);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("creates a fresh entry when Outlook lost the old one (404)", async () => {
    const row = mirrorRow("r1", true, "graph-stale", {
      bookings: bookingOf("confirmed"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph({ updateEvent: () => Promise.resolve(false) });

    const run = await syncCalendarEvents(client, graph);

    expect(run.created).toBe(1);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("re-queues a failed row keeping its graph id, so the retry patches", async () => {
    const row = mirrorRow("r1", true, "graph-1", {
      bookings: bookingOf("confirmed"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph({
      updateEvent: () => Promise.reject(new Error("Graph down")),
    });

    const run = await syncCalendarEvents(client, graph);

    expect(run.failed).toBe(1);
    expect(row.calendar_event_needs_sync).toBe(true);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("stores the created id even when the write-back fails, so the retry never duplicates", async () => {
    const row = mirrorRow("r1", true, null, {
      bookings: bookingOf("confirmed"),
    });
    // Update #1 is the claim; update #2 (the write-back after create) fails.
    const client = fakeClient([row], [2]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.failed).toBe(1);
    expect(graph.created).toEqual(["graph-1"]);
    expect(row.calendar_event_needs_sync).toBe(true);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("marks a cancelled booking Aflyst and keeps the entry and row", async () => {
    const row = mirrorRow("r1", true, "graph-1", {
      bookings: bookingOf("cancelled"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.updated).toBe(1);
    expect(graph.deleted).toEqual([]);
    expect(graph.payloads).toEqual([
      { showAs: "free", subject: "Aflyst: Room of Power · Rituals" },
    ]);
    expect(row.calendar_event_needs_sync).toBe(false);
    expect(row.calendar_event_graph_event_id).toBe("graph-1");
  });

  it("drops the row for a cancelled booking that never reached Outlook", async () => {
    const row = mirrorRow("r1", true, null, {
      bookings: bookingOf("cancelled"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.removed).toBe(1);
    expect(graph.deleted).toEqual([]);
    expect(graph.created).toEqual([]);
  });

  it("removes the entry for an expired booking and drops the row", async () => {
    const row = mirrorRow("r1", true, "graph-1", {
      bookings: bookingOf("expired"),
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.removed).toBe(1);
    expect(graph.deleted).toEqual(["graph-1"]);
  });

  it("resolves a tombstone by deleting the entry and the row", async () => {
    const row = mirrorRow("r1", true, "graph-1", {
      bookings: null,
      house_events: null,
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    const run = await syncCalendarEvents(client, graph);

    expect(run.removed).toBe(1);
    expect(graph.deleted).toEqual(["graph-1"]);
  });

  it("mirrors a house event as one entry joining the rooms", async () => {
    const row = mirrorRow("r1", true, null, {
      house_events: {
        house_event_description: "Vi rydder hele huset.",
        house_event_end_at: "2026-07-15T11:00:00Z",
        house_event_rooms: [
          { rooms: { room_name: "Room of Power" } },
          { rooms: { room_name: "Kitchen" } },
        ],
        house_event_start_at: "2026-07-15T07:00:00Z",
        house_event_title: "Værkstedsdag",
      },
    });
    const client = fakeClient([row]);
    const graph = fakeGraph();

    await syncCalendarEvents(client, graph);

    expect(graph.payloads).toEqual([
      { showAs: "busy", subject: "Værkstedsdag" },
    ]);
  });
});
