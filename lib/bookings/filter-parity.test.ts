// The two booking lists must select the same bookings (#152): the member
// overview filters in memory (filterBookingOverview, fed by
// listOwnBookingOverview) and the admin worklist filters in SQL (the
// PostgREST chain in listAdminBookings, whose or-lists the strings of
// lib/bookings/filters.ts build). This file drives both reads over the
// same synthetic rows — spanning the edges both sides cut on: a booking
// ending exactly now, a hold running out exactly now, the period range's
// edges — and evaluates the admin query's recorded operations with real
// PostgREST semantics, so every filter-row combination must keep the same
// rows.
//
// The one intended difference is pinned in its own test: a pending
// verification whose hold still stands lists on the member side (a
// standing hold files as kommende like a confirmed booking ahead) but
// never on the admin list — the admin list reads only confirmed and
// cancelled bookings, because a pending hold has no frozen snapshot yet
// and an expired hold never happened (ADR-0005), while the hold still
// blocks its room and shows on the admin calendar. The member badge's SQL
// matches the member bucket, so the badge counts it too.
//
// Out of the comparison: the admin-only tools (the worklist toggle and
// the calendar's own cuts) and the company scope — the member read is
// scoped to one company and the parity loop runs the admin filter with no
// company filter, both sides seeing the same company's rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  type BookingInvoicingStatus,
  type BookingOverviewFilter,
  type BookingOverviewRow,
  type BookingOverviewStatus,
  type BookingStateBucket,
  bookingStateBucket,
  filterBookingOverview,
} from "@/lib/domain/booking-overview";
import { periodUtcWindow } from "@/lib/domain/periods";
import type { Database } from "@/lib/supabase/database.types";
import {
  type AdminFilterOptions,
  type AdminOverviewFilter,
  listAdminBookings,
} from "./admin-data";
import { listOwnBookingOverview } from "./data";

// data.ts reaches the cancellation module for the live fee, and that
// import chain passes lib/env's boot-time validation, which no unit test
// needs (the fee computation itself is pure).
vi.mock("@/lib/env", () => ({ env: {}, isDevelopment: true }));

const companyId = "00000000-0000-0000-0000-0000000000c1";
const now = new Date("2026-09-29T12:00:00.000Z");
const nowIso = now.toISOString();

// The period the range dimension filters on: one Copenhagen day
// (ADR-0021). The window's instants are computed, so the edge rows sit at
// the true boundary whatever the offset is.
const period = periodUtcWindow("2026-09-29", "2026-09-29");
const justBeforePeriod = new Date(period.startUtc.getTime() - 1).toISOString();

// One synthetic bookings row, shaped for both reads: the columns the
// member read (data.ts) and the admin read (admin-data.ts) project. The
// ids name the case each row pins.
interface SyntheticBookingRow {
  booking_addon_total_ore: number;
  booking_addons: [];
  booking_booker_email: string;
  booking_booker_name: string;
  booking_booker_phone: string;
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_cancelled_at: string | null;
  booking_company_id: string;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_hold_expires_at: string | null;
  booking_id: string;
  booking_invoice_date: string | null;
  booking_invoice_number: string | null;
  booking_invoicing_status: BookingInvoicingStatus;
  booking_number: string;
  booking_participant_count: number;
  booking_practical_notes: null;
  // The embeds the two reads select; a real PostgREST answer carries
  // arrays (empty when a booking has no lines).
  booking_room_id: string;
  booking_room_price_ore: number;
  booking_start_at: string;
  booking_status: BookingOverviewStatus;
  companies: {
    company_display_name: string;
    company_id: string;
    company_membership_status: "external" | "member";
  };
  manual_amounts: [];
  rooms: { room_id: string; room_name: string };
}

const roomB = {
  booking_room_id: "room-b",
  rooms: { room_id: "room-b", room_name: "Stuen" },
};

const row = (
  bookingId: string,
  overrides: Partial<SyntheticBookingRow> = {}
): SyntheticBookingRow => ({
  booking_addon_total_ore: 0,
  booking_addons: [],
  booking_booker_email: "anna@virksomhed.dk",
  booking_booker_name: "Anna Booker",
  booking_booker_phone: "+45 20 30 40 50",
  booking_cancellation_fee_ore: null,
  booking_cancellation_fee_waived: false,
  booking_cancelled_at: null,
  booking_company_id: companyId,
  booking_discount_percent: 0,
  booking_end_at: "2026-09-30T17:00:00Z",
  booking_expected_total_ore: 62_500,
  booking_hold_expires_at: null,
  booking_id: bookingId,
  booking_invoice_date: null,
  booking_invoice_number: null,
  booking_invoicing_status: "not_invoiced",
  booking_number: "TB-2026-0001",
  booking_participant_count: 8,
  booking_practical_notes: null,
  booking_room_id: "room-a",
  booking_room_price_ore: 62_500,
  booking_start_at: "2026-09-30T09:00:00Z",
  booking_status: "confirmed",
  companies: {
    company_display_name: "Ærø ApS",
    company_id: companyId,
    company_membership_status: "member",
  },
  manual_amounts: [],
  rooms: { room_id: "room-a", room_name: "Lokalet" },
  ...overrides,
});

// The synthetic rows, spanning the edges both filters cut on. All rows
// share one company: the member read is scoped to it, the admin filter
// runs with no company filter.
const rows: SyntheticBookingRow[] = [
  row("upcoming-future"),
  row("upcoming-ends-now", {
    // The end-instant boundary: a booking ending exactly now is still
    // upcoming on both sides. The start sits inside the period range, so
    // the boundary row also survives the range-filtered combinations.
    booking_end_at: nowIso,
    booking_invoicing_status: "invoiced",
    booking_start_at: "2026-09-29T09:00:00Z",
    ...roomB,
  }),
  row("finished-just-ended", {
    // One millisecond past the end-instant boundary: finished on both.
    booking_end_at: "2026-09-29T11:59:59.999Z",
    booking_start_at: "2026-09-29T08:00:00Z",
  }),
  row("finished-past", {
    booking_end_at: "2026-09-22T18:00:00Z",
    booking_invoicing_status: "not_invoicable",
    booking_start_at: "2026-09-22T10:00:00Z",
    ...roomB,
  }),
  row("cancelled-future", {
    booking_cancelled_at: "2026-09-28T09:00:00Z",
    booking_status: "cancelled",
  }),
  row("cancelled-past", {
    booking_cancelled_at: "2026-09-21T09:00:00Z",
    booking_status: "cancelled",
    ...roomB,
  }),
  row("cancelled-in-range", {
    // A cancelled booking starting inside the period range: the cancelled
    // bucket stays reachable under the range filter on both sides.
    booking_cancelled_at: "2026-09-28T09:00:00Z",
    booking_start_at: "2026-09-29T14:00:00Z",
    booking_status: "cancelled",
  }),
  // The drift #152 pins: the member read carries no SQL status cut and a
  // standing hold files as kommende, so it lists; the admin list never
  // reads a pending verification at all.
  row("pending-live-hold", {
    booking_hold_expires_at: "2026-09-29T12:05:00Z",
    booking_status: "pending_verification",
  }),
  row("pending-hold-expires-now", {
    // The hold-expiry boundary: a hold running out exactly now stops
    // listing on the member side; the admin side never sees it anyway.
    booking_hold_expires_at: nowIso,
    booking_status: "pending_verification",
    ...roomB,
  }),
  row("pending-expired-hold", {
    booking_hold_expires_at: "2026-09-29T11:00:00Z",
    booking_status: "pending_verification",
  }),
  row("expired-status", {
    booking_status: "expired",
  }),
  row("range-start-edge", {
    // The period range's inclusive start edge, in Copenhagen time.
    booking_end_at: "2026-09-29T20:00:00Z",
    booking_invoicing_status: "invoiced",
    booking_start_at: period.startUtc.toISOString(),
    ...roomB,
  }),
  row("range-end-edge", {
    // The period range's exclusive end edge: a start exactly at the
    // window's end is outside on both sides.
    booking_end_at: "2026-09-30T08:00:00Z",
    booking_start_at: period.endUtc.toISOString(),
  }),
  row("range-before-edge", {
    // One millisecond before the range: outside on both sides.
    booking_end_at: "2026-09-29T09:00:00Z",
    booking_start_at: justBeforePeriod,
  }),
];

// Both reads meet the database only through the PostgREST builder chain
// (the seam data.test.ts and admin-data.test.ts fake). This fake also
// records every filtering operation on the bookings query and applies
// the same PostgREST semantics when awaited — so a read resolves the
// rows PostgREST would have returned, and the evaluator (keptByPostgrest)
// decides independently what it kept: the two must agree, which is the
// parity the test pins. A filtering method the chain starts using
// without a recorded counterpart fails the evaluation loudly: the fake
// has no such method.
type RecordedOp =
  | { column: string; kind: "eq" | "gte" | "lt"; value: string }
  | { column: string; kind: "in"; values: readonly string[] }
  | { condition: string; kind: "or" };

const parityClient = (
  tables: Record<string, object[]>
): { client: SupabaseClient<Database>; ops: RecordedOp[] } => {
  const ops: RecordedOp[] = [];
  const build = (table: string) => {
    const record = (op: RecordedOp): void => {
      if (table === "bookings") {
        ops.push(op);
      }
    };
    const builder = {
      eq: (column: string, value: string) => {
        record({ column, kind: "eq", value });
        return builder;
      },
      gte: (column: string, value: string) => {
        record({ column, kind: "gte", value });
        return builder;
      },
      in: (column: string, values: readonly string[]) => {
        record({ column, kind: "in", values });
        return builder;
      },
      limit: () => builder,
      lt: (column: string, value: string) => {
        record({ column, kind: "lt", value });
        return builder;
      },
      or: (condition: string) => {
        record({ condition, kind: "or" });
        return builder;
      },
      order: () => builder,
      select: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: the fake must be awaitable, like the real PostgREST builder it stands in for.
      then: (
        resolve: (result: { data: object[] | null; error: null }) => void
      ) => {
        // PostgREST semantics at the seam: the read gets exactly the rows
        // the recorded ops keep — never the whole set. The evaluator
        // yields the kept ids, and the fake resolves the kept rows.
        const keptIds = keptByPostgrest(
          (tables[table] ?? []) as SyntheticBookingRow[],
          ops
        );
        resolve({
          data: ((tables[table] ?? []) as SyntheticBookingRow[]).filter(
            (syntheticRow) => keptIds.has(syntheticRow.booking_id)
          ),
          error: null,
        });
      },
    };
    return builder;
  };
  return {
    client: {
      from: (table: string) => build(table),
    } as unknown as SupabaseClient<Database>,
    ops,
  };
};

// PostgREST filter semantics over the synthetic rows. The instant columns
// compare as instants — the filters double-quote their ISO values and the
// rows may carry them unquoted, so text comparison would misorder
// "…:00Z" against "…:00.000Z" — everything else in scope compares as
// text.
const INSTANT_COLUMNS = new Set([
  "booking_end_at",
  "booking_start_at",
  "booking_hold_expires_at",
]);

interface ParsedCondition {
  column: string;
  op: "eq" | "gte" | "lt";
  value: string;
}

// One `column.op.value` condition; the value may be double-quoted (the
// or-lists' timestamps are). Unknown operators fail loudly: the parity
// scope is the list chain's eq/gte/lt conditions.
const parseCondition = (token: string): ParsedCondition => {
  const columnEnd = token.indexOf(".");
  const opEnd = token.indexOf(".", columnEnd + 1);
  if (columnEnd < 0 || opEnd < 0) {
    throw new Error(`parity evaluator: not a condition: ${token}`);
  }
  const column = token.slice(0, columnEnd);
  const op = token.slice(columnEnd + 1, opEnd);
  const raw = token.slice(opEnd + 1);
  const value =
    raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  if (op !== "eq" && op !== "gte" && op !== "lt") {
    throw new Error(`parity evaluator: unsupported operator: ${token}`);
  }
  return { column, op, value };
};

// The or-lists split on their top-level commas, so an and(...) group
// stays one alternative; the quoted values carry no commas.
const splitTopLevel = (condition: string): string[] => {
  const tokens: string[] = [];
  let depth = 0;
  let token = "";
  for (const character of condition) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      tokens.push(token);
      token = "";
      continue;
    }
    token += character;
  }
  if (token !== "") {
    tokens.push(token);
  }
  return tokens;
};

const matchesCondition = (
  syntheticRow: SyntheticBookingRow,
  condition: ParsedCondition
): boolean => {
  const rowValue = syntheticRow[condition.column as keyof SyntheticBookingRow];
  if (typeof rowValue !== "string") {
    throw new Error(
      `parity evaluator: ${condition.column} is not a text or instant column`
    );
  }
  const comparable = (value: string): string | number =>
    INSTANT_COLUMNS.has(condition.column) ? Date.parse(value) : value;
  const left = comparable(rowValue);
  const right = comparable(condition.value);
  if (condition.op === "eq") {
    return left === right;
  }
  if (condition.op === "gte") {
    return left >= right;
  }
  return left < right;
};

const matchesAlternative = (
  syntheticRow: SyntheticBookingRow,
  token: string
): boolean => {
  if (token.startsWith("and(") && token.endsWith(")")) {
    return token
      .slice(4, -1)
      .split(",")
      .every((inner) => matchesCondition(syntheticRow, parseCondition(inner)));
  }
  return matchesCondition(syntheticRow, parseCondition(token));
};

const matchesOp = (
  syntheticRow: SyntheticBookingRow,
  op: RecordedOp
): boolean => {
  if (op.kind === "or") {
    return splitTopLevel(op.condition).some((token) =>
      matchesAlternative(syntheticRow, token)
    );
  }
  if (op.kind === "in") {
    return op.values.includes(
      String(syntheticRow[op.column as keyof SyntheticBookingRow])
    );
  }
  return matchesCondition(syntheticRow, {
    column: op.column,
    op: op.kind,
    value: op.value,
  });
};

// What PostgREST would have answered: every recorded operation must hold.
const keptByPostgrest = (
  syntheticRows: readonly SyntheticBookingRow[],
  ops: readonly RecordedOp[]
): Set<string> => {
  const kept = new Set<string>();
  for (const syntheticRow of syntheticRows) {
    if (ops.every((op) => matchesOp(syntheticRow, op))) {
      kept.add(syntheticRow.booking_id);
    }
  }
  return kept;
};

const memberFilter = (
  overrides: Partial<BookingOverviewFilter> = {}
): BookingOverviewFilter => ({
  bookingStates: [],
  invoicingStatuses: [],
  roomIds: [],
  ...overrides,
});

const adminFilter = (
  overrides: Partial<AdminOverviewFilter> = {}
): AdminOverviewFilter & { options: AdminFilterOptions } => ({
  bookingStates: [],
  companyIds: [],
  invoicingStatuses: [],
  memberships: [],
  now,
  options: { companies: [], rooms: [] },
  roomIds: [],
  worklist: false,
  ...overrides,
});

const keptIds = (kept: readonly { bookingId: string }[]): Set<string> =>
  new Set(kept.map((entry) => entry.bookingId));

const listMemberRows = async (): Promise<BookingOverviewRow[]> =>
  listOwnBookingOverview(parityClient({ bookings: rows }).client, companyId);

const runAdminRead = async (
  filter: AdminOverviewFilter & { options: AdminFilterOptions }
): Promise<Set<string>> => {
  const { client, ops } = parityClient({ bookings: rows });
  const adminRows = await listAdminBookings(client, filter);
  const sqlKept = keptByPostgrest(rows, ops);
  // The evaluator and the mapper must agree: with the company filter off,
  // what PostgREST kept is exactly what the read returned, so the
  // recorded-op evaluation cannot drift from the mapped rows.
  // biome-ignore lint/suspicious/noMisplacedAssertion: the helper runs inside the parity tests, where this integrity check guards the fake against drifting from the mapper.
  expect(new Set(adminRows.map((adminRow) => adminRow.bookingId))).toEqual(
    sqlKept
  );
  return sqlKept;
};

const describeSelection = (values: readonly string[]): string =>
  values.length === 0 ? "none" : values.join("+");

const describeCombo = (filter: BookingOverviewFilter): string =>
  [
    `states=${describeSelection(filter.bookingStates)}`,
    `invoicing=${describeSelection(filter.invoicingStatuses)}`,
    `rooms=${describeSelection(filter.roomIds)}`,
    `range=${
      filter.periodFrom ? `${filter.periodFrom}..${filter.periodTo}` : "none"
    }`,
  ].join(" ");

// One filter-row combination's disagreements: the bookings the two sides
// select differently, apart from the pinned member-only hold.
const parityFailures = (
  filter: BookingOverviewFilter,
  memberKept: Set<string>,
  adminKept: Set<string>
): string[] => {
  const label = describeCombo(filter);
  const failures: string[] = [];
  for (const syntheticRow of rows) {
    const memberHas = memberKept.has(syntheticRow.booking_id);
    const adminHas = adminKept.has(syntheticRow.booking_id);
    if (
      memberHas === adminHas ||
      // The intended difference pinned in its own test: the standing hold
      // lists only on the member side — never the other way around.
      (syntheticRow.booking_id === "pending-live-hold" &&
        memberHas &&
        !adminHas)
    ) {
      continue;
    }
    failures.push(
      `${label}: ${syntheticRow.booking_id} — member ${
        memberHas ? "keeps" : "drops"
      }, admin ${adminHas ? "keeps" : "drops"}`
    );
  }
  return failures;
};

const STATE_SELECTIONS: readonly BookingStateBucket[][] = [
  [],
  ["upcoming"],
  ["finished"],
  ["cancelled"],
  ["upcoming", "finished"],
  ["upcoming", "cancelled"],
  ["finished", "cancelled"],
  ["upcoming", "finished", "cancelled"],
];

const INVOICING_SELECTIONS: readonly BookingInvoicingStatus[][] = [
  [],
  ["invoiced"],
  ["not_invoiced"],
  ["not_invoicable"],
  ["invoiced", "not_invoiced"],
  ["invoiced", "not_invoicable"],
  ["not_invoiced", "not_invoicable"],
  ["invoiced", "not_invoiced", "not_invoicable"],
];

const ROOM_SELECTIONS: readonly string[][] = [[], ["room-a"], ["room-b"]];

const RANGE_SELECTIONS = [
  { periodFrom: undefined, periodTo: undefined },
  { periodFrom: "2026-09-29", periodTo: "2026-09-29" },
] as const;

describe("member/admin filter parity (#152)", () => {
  it("selects the same bookings for every filter-row combination", async () => {
    const memberRows = await listMemberRows();
    const failures: string[] = [];
    for (const bookingStates of STATE_SELECTIONS) {
      for (const invoicingStatuses of INVOICING_SELECTIONS) {
        for (const roomIds of ROOM_SELECTIONS) {
          for (const range of RANGE_SELECTIONS) {
            const filter = memberFilter({
              bookingStates,
              invoicingStatuses,
              periodFrom: range.periodFrom,
              periodTo: range.periodTo,
              roomIds,
            });
            const memberKept = keptIds(
              filterBookingOverview(memberRows, filter, now)
            );
            // biome-ignore lint/performance/noAwaitInLoops: each read runs against a fresh fake; sequential reads keep the failure report readable.
            const adminKept = await runAdminRead(
              adminFilter({
                bookingStates,
                invoicingStatuses,
                periodFrom: range.periodFrom,
                periodTo: range.periodTo,
                roomIds: [...roomIds],
              })
            );
            failures.push(...parityFailures(filter, memberKept, adminKept));
          }
        }
      }
    }
    expect(failures, "both lists must select the same bookings").toEqual([]);
  });

  it("lists a standing hold only on the member side — the intended difference", async () => {
    // The drift #152 identifies: listOwnBookingOverview carries no SQL
    // status cut, and a pending verification whose hold still stands files
    // as kommende like a confirmed booking ahead (bookingStateBucket), so
    // the member list shows it. The admin worklist deliberately never
    // shows it: the list reads only confirmed and cancelled bookings — a
    // pending hold has no frozen snapshot yet and an expired hold never
    // happened (ADR-0005) — while the hold still blocks its room and shows
    // on the admin calendar. The member badge's SQL matches the member
    // bucket, so the badge counts it too. Pinned so a change on either
    // side must revisit this file.
    const memberRows = await listMemberRows();
    const memberBuckets = new Map(
      memberRows.map((entry) => [
        entry.bookingId,
        bookingStateBucket(entry, now),
      ])
    );
    expect(memberBuckets.get("pending-live-hold")).toBe("upcoming");

    // No filter: the member keeps it, the admin list does not.
    const unfiltered = keptIds(
      filterBookingOverview(memberRows, memberFilter(), now)
    );
    expect(unfiltered.has("pending-live-hold")).toBe(true);
    expect((await runAdminRead(adminFilter())).has("pending-live-hold")).toBe(
      false
    );

    // The kommende bucket ticked: still member only.
    const upcoming = keptIds(
      filterBookingOverview(
        memberRows,
        memberFilter({ bookingStates: ["upcoming"] }),
        now
      )
    );
    expect(upcoming.has("pending-live-hold")).toBe(true);
    expect(
      (await runAdminRead(adminFilter({ bookingStates: ["upcoming"] }))).has(
        "pending-live-hold"
      )
    ).toBe(false);

    // And no booking-state selection ever surfaces it on the admin list.
    for (const bookingStates of STATE_SELECTIONS) {
      expect(
        // biome-ignore lint/performance/noAwaitInLoops: sequential reads keep the per-state failure report readable.
        (await runAdminRead(adminFilter({ bookingStates }))).has(
          "pending-live-hold"
        ),
        `states=${bookingStates.join(", ")}`
      ).toBe(false);
    }
  });

  it("cuts the state buckets on the end instant identically", async () => {
    // A meeting that ends exactly now is still upcoming on both sides —
    // the member bucket's `>=` and the admin filter's gte; one
    // millisecond past it is finished on both. The single-bucket
    // selections make the boundary assignment explicit.
    const memberRows = await listMemberRows();
    const memberUpcoming = keptIds(
      filterBookingOverview(
        memberRows,
        memberFilter({ bookingStates: ["upcoming"] }),
        now
      )
    );
    const memberFinished = keptIds(
      filterBookingOverview(
        memberRows,
        memberFilter({ bookingStates: ["finished"] }),
        now
      )
    );
    const adminUpcoming = await runAdminRead(
      adminFilter({ bookingStates: ["upcoming"] })
    );
    const adminFinished = await runAdminRead(
      adminFilter({ bookingStates: ["finished"] })
    );
    expect(memberUpcoming.has("upcoming-ends-now")).toBe(true);
    expect(adminUpcoming.has("upcoming-ends-now")).toBe(true);
    expect(memberFinished.has("upcoming-ends-now")).toBe(false);
    expect(adminFinished.has("upcoming-ends-now")).toBe(false);
    expect(memberUpcoming.has("finished-just-ended")).toBe(false);
    expect(adminUpcoming.has("finished-just-ended")).toBe(false);
    expect(memberFinished.has("finished-just-ended")).toBe(true);
    expect(adminFinished.has("finished-just-ended")).toBe(true);
  });

  it("drops a hold that ran out on both sides — parity at the hold boundary", async () => {
    // The member stops listing a pending verification once its hold has
    // run out (the hold's instant, now included); the admin list never
    // reads the status at all. Both sides drop it — the issue's example
    // of a provable case is parity, not drift.
    const memberRows = await listMemberRows();
    const memberBuckets = new Map(
      memberRows.map((entry) => [
        entry.bookingId,
        bookingStateBucket(entry, now),
      ])
    );
    expect(memberBuckets.get("pending-live-hold")).toBe("upcoming");
    expect(memberBuckets.get("pending-hold-expires-now")).toBeNull();
    expect(memberBuckets.get("pending-expired-hold")).toBeNull();
    const memberKept = keptIds(
      filterBookingOverview(memberRows, memberFilter(), now)
    );
    expect(memberKept.has("pending-hold-expires-now")).toBe(false);
    expect(memberKept.has("pending-expired-hold")).toBe(false);
    const adminKept = await runAdminRead(adminFilter());
    expect(adminKept.has("pending-hold-expires-now")).toBe(false);
    expect(adminKept.has("pending-expired-hold")).toBe(false);
  });
});
