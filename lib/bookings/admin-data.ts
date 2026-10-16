// Read-side for the admin booking overview (#9, DESIGN.md "Bookinger
// (admin)"). Session client + RLS under the admin session the layout
// guards: the list reads every confirmed and cancelled booking in the
// period — the two statuses a basis can exist for; a pending hold has no
// frozen snapshot yet and an expired hold never happened, so neither is a
// row, but the hold still blocks its room and shows on the calendar.
// The calendar reads the same window with the live statuses.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminBookingRow,
  AdminBookingState,
  AdminMembership,
} from "@/lib/domain/admin-bookings";
import type { BookingInvoicingStatus } from "@/lib/domain/booking-overview";
import { periodUtcWindow } from "@/lib/domain/periods";
import type { DayEntry } from "@/lib/notice-board/data";
import type { Database } from "@/lib/supabase/database.types";
import { selectedCompanyIds } from "./admin-company-filter";
import { adminDisplayNames, listRoomOptions, type RoomOption } from "./data";
import {
  adminBookingStatesFilter,
  adminCalendarStateCuts,
  outstandingInvoicesFilter,
} from "./filters";
import { rowsOrThrow } from "./rows";

type Client = SupabaseClient<Database>;
type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** The filters the URL carries; both views read the same set (#9). An
 * empty list selects everything — the multi-select's no-selection state.
 * The optional period range is the filter row's date picker, shown on the
 * list view only: bookings starting within it, absent meaning no date
 * filter — the default row set is every booking. The calendar reads no
 * range; it narrows to its month window (fromDate/toDate, the stepper's)
 * alone. The booking-state buckets cut on `now`, the read instant the
 * page injects. Both reads apply them, but the calendar reads no
 * cancelled bookings, so an Aflyste-only selection empties the month
 * view by design (deliberate, not a list-only filter like the date
 * range). The worklist toggle (?worklist=1, the sidebar badge's set)
 * IS a list tool like the date range: the calendar ignores it. */
export interface AdminOverviewFilter {
  // The POST export's picked ids (#123): the ticked bookings, read under
  // RLS and exported in the given order — the order the table displayed
  // them. The GET path never carries them.
  bookingIds?: string[];
  bookingStates: AdminBookingState[];
  companyIds: string[];
  fromDate?: string;
  invoicingStatuses: BookingInvoicingStatus[];
  memberships: AdminMembership[];
  now: Date;
  periodFrom?: string;
  periodTo?: string;
  roomIds: string[];
  toDate?: string;
  worklist: boolean;
}

/** What the filter selects offer: every company and every room. */
export interface AdminFilterOptions {
  companies: Array<{
    companyId: string;
    displayName: string;
    membershipStatus: AdminMembership;
  }>;
  rooms: RoomOption[];
}

// A name embed the foreign keys guarantee but that RLS could still hide:
// a row without the name it must render fails loudly.
function requiredName(
  name: string | null | undefined,
  subject: string,
  id: string
): string {
  if (!name) {
    throw new Error(`booking ${id} is missing its ${subject}`);
  }
  return name;
}

interface AdminBookingQueryRow {
  booking_addon_total_ore: number;
  booking_addons: Array<{
    addons: { addon_name: string; addon_description: string | null } | null;
    booking_addon_addon_id: string;
    booking_addon_quantity: number;
    booking_addon_total_ore: number;
  }> | null;
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_cancelled_at: string | null;
  booking_company_id: string;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_id: string;
  booking_invoice_date: string | null;
  booking_invoice_number: string | null;
  booking_invoicing_status: BookingInvoicingStatus;
  booking_number: string;
  booking_practical_notes: string | null;
  booking_room_price_ore: number;
  booking_start_at: string;
  booking_status: BookingStatus;
  companies: {
    company_display_name: string;
    company_id: string;
    company_membership_status: AdminMembership;
  } | null;
  manual_amounts: Array<{
    manual_amount_amount_ore: number;
    manual_amount_created_at: string;
    manual_amount_created_by: string | null;
    manual_amount_id: string;
    manual_amount_note: string;
  }> | null;
  rooms: { room_id: string; room_name: string } | null;
}

function toAdminBookingRow(
  row: AdminBookingQueryRow,
  adminNames: ReadonlyMap<string, string>
): AdminBookingRow {
  const companyName = requiredName(
    row.companies?.company_display_name,
    "company",
    row.booking_id
  );
  const room = row.rooms
    ? { roomId: row.rooms.room_id, roomName: row.rooms.room_name }
    : null;
  if (!room) {
    throw new Error(`booking ${row.booking_id} is missing its room`);
  }
  const manualAmounts = (row.manual_amounts ?? []).map((amount) => ({
    amountOre: amount.manual_amount_amount_ore,
    createdAt: amount.manual_amount_created_at,
    createdByName: amount.manual_amount_created_by
      ? (adminNames.get(amount.manual_amount_created_by) ?? null)
      : null,
    manualAmountId: amount.manual_amount_id,
    note: amount.manual_amount_note,
  }));
  return {
    addOns: (row.booking_addons ?? []).map((line) => ({
      addonId: line.booking_addon_addon_id,
      description: line.addons?.addon_description ?? null,
      name: line.addons?.addon_name ?? null,
      quantity: line.booking_addon_quantity,
      totalOre: line.booking_addon_total_ore,
    })),
    addonTotalOre: row.booking_addon_total_ore,
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    bookingStatus: row.booking_status,
    cancellationFeeOre: row.booking_cancellation_fee_ore,
    cancellationFeeWaived: row.booking_cancellation_fee_waived,
    cancelledAt: row.booking_cancelled_at,
    companyId: row.companies?.company_id ?? "",
    companyName,
    discountPercent: row.booking_discount_percent,
    endAt: row.booking_end_at,
    invoiceDate: row.booking_invoice_date,
    invoiceNumber: row.booking_invoice_number,
    invoicingStatus: row.booking_invoicing_status,
    manualAmounts,
    manualAmountsOre: manualAmounts.reduce(
      (sum, amount) => sum + amount.amountOre,
      0
    ),
    membershipStatus: row.companies?.company_membership_status ?? "external",
    practicalNotes: row.booking_practical_notes,
    roomId: room.roomId,
    roomName: room.roomName,
    roomPriceOre: row.booking_room_price_ore,
    startAt: row.booking_start_at,
  };
}

// The Bookingstatus buckets on a bookings query (#9): one bucket chains
// as plain filters — the PostgREST or-list parses a lone and(...) as a
// parse error — several buckets ride the or-list lib/bookings/filters.ts
// builds. Cancelled is its own bucket; the time buckets are confirmed
// bookings that have (not) finished, cut on the end instant (see
// adminBookingStatesFilter). An empty selection applies nothing.
function withBookingStates<
  Q extends {
    eq: (column: string, value: string) => Q;
    gte: (column: string, value: string) => Q;
    lt: (column: string, value: string) => Q;
    or: (condition: string) => Q;
  },
>(query: Q, states: readonly AdminBookingState[], nowIso: string): Q {
  if (states.length === 0) {
    return query;
  }
  if (states.length === 1) {
    const [state] = states;
    if (state === "cancelled") {
      return query.eq("booking_status", "cancelled");
    }
    const timeBounded = query.eq("booking_status", "confirmed");
    return state === "upcoming"
      ? timeBounded.gte("booking_end_at", nowIso)
      : timeBounded.lt("booking_end_at", nowIso);
  }
  return query.or(adminBookingStatesFilter(states, nowIso));
}

// One row per booking, in start order — the admin overview's rows. The
// period is optional: the list shows every booking, the calendar narrows
// to its window. The period filter reads the Copenhagen wall clock
// (ADR-0021) through the UTC window; company, room and invoicing status
// are the SQL filters. The options carry the membership → company-ids
// resolution (see selectedCompanyIds).
// The admin row's columns: the list and the calendar read the same shape,
// so a calendar entry can open the same detail sheet the table does.
const ADMIN_BOOKING_SELECT =
  "booking_addon_total_ore, booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_cancelled_at, booking_company_id, booking_discount_percent, booking_end_at, booking_id, booking_invoice_date, booking_invoicing_status, booking_invoice_number, booking_number, booking_practical_notes, booking_room_price_ore, booking_start_at, booking_status, rooms(room_id, room_name), companies(company_id, company_display_name, company_membership_status), booking_addons(booking_addon_addon_id, booking_addon_quantity, booking_addon_total_ore, addons(addon_name, addon_description)), manual_amounts(manual_amount_amount_ore, manual_amount_created_at, manual_amount_created_by, manual_amount_id, manual_amount_note)";

export async function listAdminBookings(
  supabase: Client,
  filter: AdminOverviewFilter & { options: AdminFilterOptions }
): Promise<AdminBookingRow[]> {
  const { options } = filter;
  let query = supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .in("booking_status", ["confirmed", "cancelled"])
    .order("booking_addon_addon_id", {
      ascending: true,
      referencedTable: "booking_addons",
    })
    .order("booking_start_at")
    .order("manual_amount_created_at", {
      ascending: true,
      referencedTable: "manual_amounts",
    });

  if (filter.fromDate && filter.toDate) {
    const window = periodUtcWindow(filter.fromDate, filter.toDate);
    query = query
      .gte("booking_start_at", window.startUtc.toISOString())
      .lt("booking_start_at", window.endUtc.toISOString());
  }

  // The filter row's date range: bookings starting within it. Absent —
  // no range picked — and the list keeps every booking.
  if (filter.periodFrom && filter.periodTo) {
    const range = periodUtcWindow(filter.periodFrom, filter.periodTo);
    query = query
      .gte("booking_start_at", range.startUtc.toISOString())
      .lt("booking_start_at", range.endUtc.toISOString());
  }

  // Company and membership type intersect: the booking's company must
  // answer to both filters. A membership filter is the resolved id list,
  // not an embedded-column filter — PostgREST mangles the embed when it
  // filters on companies.company_membership_status (verified locally —
  // rows come back with `companies: null`). Null resolution = no filter;
  // an active filter with no ids matches nothing.
  const companyIds = selectedCompanyIds(filter, options);
  if (companyIds !== null && companyIds.length === 0) {
    // An active company-ish filter that resolves to no ids: nothing matches.
    return [];
  }
  if (companyIds !== null) {
    query = query.in("booking_company_id", companyIds);
  }
  if (filter.roomIds.length > 0) {
    query = query.in("booking_room_id", filter.roomIds);
  }
  if (filter.invoicingStatuses.length > 0) {
    query = query.in("booking_invoicing_status", filter.invoicingStatuses);
  }
  if (filter.bookingIds !== undefined) {
    query = query.in("booking_id", filter.bookingIds);
  }

  // The Bookingstatus buckets: cancelled, or confirmed with the end (not)
  // passed — the member page's buckets too (bookingStateBucket). The list
  // carries only confirmed and cancelled rows, so the buckets partition it.
  query = withBookingStates(
    query,
    filter.bookingStates,
    filter.now.toISOString()
  );

  // The sidebar badge's worklist (?worklist=1): ended bookings without an
  // invoice — confirmed as a whole, cancelled only with a payable fee —
  // the set outstandingInvoicesFilter splits and the badge counts. ANDed
  // with the other filters; the calendar applies nothing.
  if (filter.worklist) {
    query = query
      .eq("booking_invoicing_status", "not_invoiced")
      .lt("booking_end_at", filter.now.toISOString())
      .or(outstandingInvoicesFilter());
  }

  const bookings = rowsOrThrow<AdminBookingQueryRow>(
    await query,
    "admin bookings"
  );
  const adminNames = await adminDisplayNames(
    supabase,
    bookings.flatMap((booking) =>
      (booking.manual_amounts ?? []).map(
        (amount) => amount.manual_amount_created_by
      )
    )
  );
  return bookings.map((booking) => toAdminBookingRow(booking, adminNames));
}

/** The companies and rooms the filter selects offer (catalogue-sized). */
export async function listAdminFilterOptions(
  supabase: Client
): Promise<AdminFilterOptions> {
  const [companies, rooms] = await Promise.all([
    supabase
      .from("companies")
      .select("company_id, company_display_name, company_membership_status")
      .order("company_display_name")
      .limit(500),
    listRoomOptions(supabase),
  ]);
  return {
    companies: rowsOrThrow(companies, "filter companies").map((company) => ({
      companyId: company.company_id,
      displayName: company.company_display_name,
      membershipStatus: company.company_membership_status,
    })),
    rooms,
  };
}

// ---------------------------------------------------------------------------
// The calendar's entries (#9): the same filters, the live statuses — a
// pending hold blocks its room, a cancelled booking does not. The row shape
// is the notice board's DayEntry (lib/notice-board/data.ts) plus the
// company id and the statuses the TS filters read.

export interface AdminCalendarEntry extends DayEntry {
  bookingInvoicingStatus: BookingInvoicingStatus | null;
  bookingStatus: string | null;
  companyId: string | null;
}

// The instant window the calendar shows: entries OVERLAP it, so a booking
// that started the evening before still shows on the next morning's cell.
export function calendarUtcWindow(
  fromDate: string,
  toDate: string
): { endUtc: Date; startUtc: Date } {
  return periodUtcWindow(fromDate, toDate);
}

/** Every live booking touching the window, per room — with the same rows
 * the list reads, so a click opens the table's own detail sheet (#123). */
export async function listAdminCalendarEntries(
  supabase: Client,
  filter: AdminOverviewFilter & {
    fromDate: string;
    toDate: string;
    options: AdminFilterOptions;
  }
): Promise<{ entries: AdminCalendarEntry[]; rows: AdminBookingRow[] }> {
  const { options } = filter;
  const window = calendarUtcWindow(filter.fromDate, filter.toDate);
  const fromIso = window.startUtc.toISOString();
  const toIso = window.endUtc.toISOString();
  const nowIso = filter.now.toISOString();

  let bookingsQuery = supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .in("booking_status", ["pending_verification", "confirmed"])
    .lt("booking_start_at", toIso)
    .gt("booking_end_at", fromIso)
    .order("booking_start_at")
    // Bounded: the window holds a few dozen entries at most.
    .limit(1000);
  // Company and membership type intersect, resolved to id lists before the
  // query (the same rule the list uses — the embed itself cannot be
  // trusted under an embedded-column filter). Null resolution = no filter;
  // an active filter with no ids matches nothing.
  const companyIds = selectedCompanyIds(filter, options);
  if (companyIds !== null && companyIds.length === 0) {
    // The active company-ish filter resolves to no ids: nothing matches.
    return { entries: [], rows: [] };
  }
  if (companyIds !== null) {
    bookingsQuery = bookingsQuery.in("booking_company_id", companyIds);
  }
  if (filter.roomIds.length > 0) {
    bookingsQuery = bookingsQuery.in("booking_room_id", filter.roomIds);
  }
  if (filter.invoicingStatuses.length > 0) {
    bookingsQuery = bookingsQuery.in(
      "booking_invoicing_status",
      filter.invoicingStatuses
    );
  }
  // The Bookingstatus buckets, on the calendar's own terms: the time cuts
  // ride the entries' starts and OR together (lib/bookings/filters.ts);
  // an Aflyste-only selection returns no cuts — the calendar reads no
  // cancelled bookings, so the month view is empty.
  if (filter.bookingStates.length > 0) {
    const cuts = adminCalendarStateCuts(filter.bookingStates, nowIso);
    if (cuts === "") {
      return { entries: [], rows: [] };
    }
    bookingsQuery = bookingsQuery.or(cuts);
  }
  const bookings = rowsOrThrow<AdminBookingQueryRow>(
    await bookingsQuery,
    "calendar bookings"
  );

  // The display name from the options catalogue, not the embed: under a
  // membership filter PostgREST can return `companies: null`.
  const companyNames = new Map(
    options.companies.map((company) => [company.companyId, company.displayName])
  );

  const entries = bookings.flatMap((row) => {
    if (!row.rooms) {
      return [];
    }
    return [
      {
        bookingInvoicingStatus: row.booking_invoicing_status,
        bookingStatus: row.booking_status,
        companyId: row.booking_company_id,
        companyName: companyNames.get(row.booking_company_id) ?? null,
        description: null,
        endAt: new Date(row.booking_end_at),
        id: row.booking_id,
        kind: "booking" as const,
        roomId: row.rooms.room_id,
        roomName: row.rooms.room_name,
        startAt: new Date(row.booking_start_at),
        title: null,
      },
    ];
  });

  // The rows behind the entries: the detail sheet reads them, so the
  // calendar's click shows the same sheet the table does.
  const adminNames = await adminDisplayNames(
    supabase,
    bookings.flatMap((row) =>
      (row.manual_amounts ?? []).map(
        (amount) => amount.manual_amount_created_by
      )
    )
  );
  const rows = bookings.map((row) => toAdminBookingRow(row, adminNames));

  return { entries, rows };
}
