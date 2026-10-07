// Read-side for the admin booking overview (#9, DESIGN.md "Bookinger
// (admin)"). Session client + RLS under the admin session the layout
// guards: the list reads every confirmed and cancelled booking in the
// period — the two statuses a basis can exist for; a pending hold has no
// frozen snapshot yet and an expired hold never happened, so neither is a
// row, but the hold still blocks its room and shows on the calendar. The
// calendar reads the same window with the live statuses. House Events ride
// along in both, as "Ikke fakturerbar" — they are not bookings and never
// enter the basis (CONTEXT.md "House Event").
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import type {
  AdminBookingRow,
  AdminHouseEventRow,
  AdminMembership,
  AdminOverviewRow,
} from "@/lib/domain/admin-bookings";
import type { BookingInvoicingStatus } from "@/lib/domain/booking-overview";
import { periodUtcWindow } from "@/lib/domain/periods";
import type { BookingDetail, DayEntry } from "@/lib/notice-board/data";
import type { Database } from "@/lib/supabase/database.types";
import { adminDisplayNames } from "./data";

type Client = SupabaseClient<Database>;
type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** The filters the URL carries; both views read the same set (#9). An
 * empty list selects everything — the multi-select's no-selection state. */
export interface AdminOverviewFilter {
  companyIds: string[];
  fromDate: string;
  includeHouseEvents: boolean;
  invoicingStatuses: BookingInvoicingStatus[];
  memberships: AdminMembership[];
  roomIds: string[];
  toDate: string;
}

/** What the filter selects offer: every company and every room. */
export interface AdminFilterOptions {
  companies: Array<{
    companyId: string;
    displayName: string;
    membershipStatus: AdminMembership;
  }>;
  rooms: Array<{ roomId: string; roomName: string }>;
}

function rowsOrThrow<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  subject: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${subject}: ${result.error.message}`);
  }
  return result.data ?? [];
}

// A House Event is no company's row and never invoicable (CONTEXT.md
// "House Event"): it leaves the set with a company or membership filter,
// with the hide filter (#9), and with an invoicing-status filter it cannot
// answer to — its own status is "not_invoicable", so the filter keeps it
// only when that status is among the selected.
function houseEventsShown(filter: AdminOverviewFilter): boolean {
  return (
    filter.includeHouseEvents &&
    filter.companyIds.length === 0 &&
    filter.memberships.length === 0 &&
    (filter.invoicingStatuses.length === 0 ||
      filter.invoicingStatuses.includes("not_invoicable"))
  );
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
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_id: string;
  booking_invoice_date: string | null;
  booking_invoice_number: string | null;
  booking_invoicing_status: BookingInvoicingStatus;
  booking_number: string;
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
    addonTotalOre: row.booking_addon_total_ore,
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    bookingStatus: row.booking_status,
    cancellationFeeOre: row.booking_cancellation_fee_ore,
    cancellationFeeWaived: row.booking_cancellation_fee_waived,
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
    roomId: room.roomId,
    roomName: room.roomName,
    roomPriceOre: row.booking_room_price_ore,
    startAt: row.booking_start_at,
  };
}

// Bookings that start on a date in the period, one row per booking. The
// period filter reads the Copenhagen wall clock (ADR-0021) through the
// UTC window; company, room and invoicing status are the SQL filters.
async function listAdminBookings(
  supabase: Client,
  filter: AdminOverviewFilter & { options: AdminFilterOptions }
): Promise<AdminBookingRow[]> {
  const { options } = filter;
  const window = periodUtcWindow(filter.fromDate, filter.toDate);
  let query = supabase
    .from("bookings")
    .select(
      "booking_addon_total_ore, booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_discount_percent, booking_end_at, booking_id, booking_invoice_date, booking_invoicing_status, booking_invoice_number, booking_number, booking_room_price_ore, booking_start_at, booking_status, rooms(room_id, room_name), companies(company_id, company_display_name, company_membership_status), manual_amounts(manual_amount_amount_ore, manual_amount_created_at, manual_amount_created_by, manual_amount_id, manual_amount_note)"
    )
    .in("booking_status", ["confirmed", "cancelled"])
    .gte("booking_start_at", window.startUtc.toISOString())
    .lt("booking_start_at", window.endUtc.toISOString())
    .order("booking_start_at")
    .order("manual_amount_created_at", {
      ascending: true,
      referencedTable: "manual_amounts",
    });

  // Company and membership type intersect: the booking's company must
  // answer to both filters. A membership filter is the resolved id list,
  // not an embedded-column filter — PostgREST mangles the embed when it
  // filters on companies.company_membership_status (verified locally —
  // rows come back with `companies: null`).
  const companyIds = selectedCompanyIds(filter, options);
  if (filter.companyIds.length > 0 && companyIds.length === 0) {
    // The chosen companies hold no chosen membership type: nothing matches.
    return [];
  }
  if (companyIds.length > 0) {
    query = query.in("booking_company_id", companyIds);
  }
  if (filter.roomIds.length > 0) {
    query = query.in("booking_room_id", filter.roomIds);
  }
  if (filter.invoicingStatuses.length > 0) {
    query = query.in("booking_invoicing_status", filter.invoicingStatuses);
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

interface AdminHouseEventQueryRow {
  house_event_description: string;
  house_event_end_at: string;
  house_event_id: string;
  house_event_rooms: Array<{
    rooms: { room_id: string; room_name: string } | null;
  }> | null;
  house_event_start_at: string;
  house_event_title: string | null;
}

// One row per event, the rooms it blocks joined into the row — an event
// spans rooms the way its sheet shows them (lib/notice-board/data.ts).
function toAdminHouseEventRow(
  row: AdminHouseEventQueryRow
): AdminHouseEventRow {
  const roomNames = (row.house_event_rooms ?? []).flatMap((entry) =>
    entry.rooms ? [entry.rooms.room_name] : []
  );
  return {
    description: row.house_event_description,
    endAt: row.house_event_end_at,
    houseEventId: row.house_event_id,
    roomNames,
    startAt: row.house_event_start_at,
    title: row.house_event_title,
  };
}

async function listAdminHouseEvents(
  supabase: Client,
  filter: AdminOverviewFilter
): Promise<AdminHouseEventRow[]> {
  const window = periodUtcWindow(filter.fromDate, filter.toDate);
  let query = supabase
    .from("house_events")
    .select(
      "house_event_description, house_event_end_at, house_event_id, house_event_rooms(rooms(room_id, room_name)), house_event_start_at, house_event_title"
    )
    .lt("house_event_start_at", window.endUtc.toISOString())
    .gt("house_event_end_at", window.startUtc.toISOString())
    .order("house_event_start_at");

  if (filter.roomIds.length > 0) {
    // The room filter reads the embedded rooms (see
    // listAdminCalendarEntries): an event keeping at least one matching
    // room stays and shows only those rooms.
    query = query.in("house_event_rooms.rooms.room_id", filter.roomIds);
  }

  return rowsOrThrow<AdminHouseEventQueryRow>(
    await query,
    "admin house events"
  ).map(toAdminHouseEventRow);
}

/** The overview rows for the period and its filters: bookings and House
 * Events, start order is applied by the list's sort. The options carry the
 * membership → company-ids resolution (see membershipCompanyIds). */
export async function listAdminOverviewRows(
  supabase: Client,
  filter: AdminOverviewFilter & { options: AdminFilterOptions }
): Promise<AdminOverviewRow[]> {
  const [bookings, events] = await Promise.all([
    listAdminBookings(supabase, filter),
    houseEventsShown(filter) ? listAdminHouseEvents(supabase, filter) : [],
  ]);
  const eventRows: AdminOverviewRow[] = events.map((row) => ({
    kind: "house_event" as const,
    row,
  }));
  return [
    ...bookings.map((row) => ({ kind: "booking" as const, row })),
    ...eventRows,
  ];
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
    supabase.from("rooms").select("room_id, room_name").order("room_name"),
  ]);
  return {
    companies: rowsOrThrow(companies, "filter companies").map((company) => ({
      companyId: company.company_id,
      displayName: company.company_display_name,
      membershipStatus: company.company_membership_status,
    })),
    rooms: rowsOrThrow(rooms, "filter rooms").map((room) => ({
      roomId: room.room_id,
      roomName: room.room_name,
    })),
  };
}

/**
 * The company ids a membership filter selects, resolved from the options:
 * PostgREST cannot filter on an embedded column without mangling the embed
 * (rows come back with `companies: null`), so the membership filter is an
 * id list on the owning column. Several selected types union.
 */
export function membershipCompanyIds(
  options: AdminFilterOptions,
  memberships: readonly AdminMembership[]
): string[] {
  const wanted = new Set(memberships);
  return options.companies
    .filter((company) => wanted.has(company.membershipStatus))
    .map((company) => company.companyId);
}

// The company ids the two company-ish filters select together: the picked
// companies and the picked membership types intersect — a booking's
// company must answer to both (an empty list selects everything).
function selectedCompanyIds(
  filter: AdminOverviewFilter,
  options: AdminFilterOptions
): string[] {
  if (filter.memberships.length === 0) {
    return filter.companyIds;
  }
  const allowed = new Set(membershipCompanyIds(options, filter.memberships));
  return filter.companyIds.filter((companyId) => allowed.has(companyId));
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

interface CalendarBookingQueryRow {
  booking_company_id: string;
  booking_end_at: string;
  booking_id: string;
  booking_invoicing_status: BookingInvoicingStatus;
  booking_start_at: string;
  booking_status: BookingStatus;
  rooms: { room_id: string; room_name: string } | null;
}

interface CalendarEventQueryRow {
  house_event_description: string;
  house_event_end_at: string;
  house_event_id: string;
  house_event_rooms: Array<{
    rooms: { room_id: string; room_name: string } | null;
  }> | null;
  house_event_start_at: string;
  house_event_title: string | null;
}

// The instant window the calendar shows: entries OVERLAP it, so an event
// that started the evening before still blocks the morning (the day grid
// widens by the buffer, lib/notice-board/data.ts).
export function calendarUtcWindow(
  fromDate: string,
  toDate: string
): { endUtc: Date; startUtc: Date } {
  return periodUtcWindow(fromDate, toDate);
}

/** Every live booking and House Event touching the window, per room. */
export async function listAdminCalendarEntries(
  supabase: Client,
  filter: AdminOverviewFilter & { options: AdminFilterOptions }
): Promise<AdminCalendarEntry[]> {
  const { options } = filter;
  const window = calendarUtcWindow(filter.fromDate, filter.toDate);
  const fromIso = window.startUtc.toISOString();
  const toIso = window.endUtc.toISOString();

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "booking_company_id, booking_end_at, booking_id, booking_invoicing_status, booking_start_at, booking_status, rooms(room_id, room_name)"
    )
    .in("booking_status", ["pending_verification", "confirmed"])
    .lt("booking_start_at", toIso)
    .gt("booking_end_at", fromIso)
    .order("booking_start_at")
    // Bounded: the window holds a few dozen entries at most.
    .limit(1000);
  // Company and membership type intersect, resolved to id lists before the
  // query (the same rule the list uses — the embed itself cannot be
  // trusted under an embedded-column filter).
  const companyIds = selectedCompanyIds(filter, options);
  const companyFilterActive = filter.companyIds.length > 0;
  if (companyFilterActive && companyIds.length === 0) {
    // The chosen companies hold no chosen membership type: nothing matches.
    return [];
  }
  if (companyIds.length > 0) {
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
  const bookings = rowsOrThrow<CalendarBookingQueryRow>(
    await bookingsQuery,
    "calendar bookings"
  );

  let eventsQuery = supabase
    .from("house_events")
    .select(
      "house_event_description, house_event_end_at, house_event_id, house_event_rooms(rooms(room_id, room_name)), house_event_start_at, house_event_title"
    )
    .lt("house_event_start_at", toIso)
    .gt("house_event_end_at", fromIso)
    .order("house_event_start_at")
    .limit(1000);
  if (filter.roomIds.length > 0) {
    // The room filter reads the embedded rooms: an event keeping at least
    // one matching room stays and shows only those rooms. Filtered through
    // the rooms embed — house_event_rooms has no room_id of its own
    // (ADR-0018: the FK keeps the rooms prefix).
    eventsQuery = eventsQuery.in(
      "house_event_rooms.rooms.room_id",
      filter.roomIds
    );
  }
  const events = rowsOrThrow<CalendarEventQueryRow>(
    await eventsQuery,
    "calendar house events"
  );

  // The display name from the options catalogue, not the embed: under a
  // membership filter PostgREST can return `companies: null`.
  const companyNames = new Map(
    options.companies.map((company) => [company.companyId, company.displayName])
  );

  const bookingEntries: AdminCalendarEntry[] = bookings.flatMap((row) => {
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

  // An event is one entry per room it blocks, the way the day grid and the
  // notice board place it (lib/notice-board/grid.ts).
  const eventEntries: AdminCalendarEntry[] = houseEventsShown(filter)
    ? events.flatMap((row) =>
        (row.house_event_rooms ?? []).flatMap((entry) =>
          entry.rooms
            ? [
                {
                  bookingInvoicingStatus: null,
                  bookingStatus: null,
                  companyId: null,
                  companyName: null,
                  description: row.house_event_description,
                  endAt: new Date(row.house_event_end_at),
                  id: row.house_event_id,
                  kind: "house_event" as const,
                  roomId: entry.rooms.room_id,
                  roomName: entry.rooms.room_name,
                  startAt: new Date(row.house_event_start_at),
                  title: row.house_event_title,
                },
              ]
            : []
        )
      )
    : [];

  return [...bookingEntries, ...eventEntries];
}

// The detail lines the calendar's sheets show for an admin (#12): the same
// projection lib/notice-board/data.ts lists for a day, here for the whole
// visible window so a week or month can open a sheet too.
export async function listAdminBookingDetails(
  supabase: Client,
  fromDate: string,
  toDate: string
): Promise<Map<string, BookingDetail>> {
  const window = calendarUtcWindow(fromDate, toDate);
  const rows = rowsOrThrow(
    await supabase
      .from("bookings")
      .select(
        "booking_id, booking_number, booking_booker_name, booking_booker_email, booking_booker_phone, booking_participant_count, booking_practical_notes, booking_internal_note, booking_status, booking_addon_total_ore, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_room_price_ore, booking_start_at"
      )
      .in("booking_status", ["pending_verification", "confirmed"])
      .lt("booking_start_at", window.endUtc.toISOString())
      .gt("booking_end_at", window.startUtc.toISOString())
      .limit(1000),
    "calendar booking details"
  );
  return new Map(
    rows.map((row) => [
      row.booking_id,
      {
        bookerEmail: row.booking_booker_email,
        bookerName: row.booking_booker_name,
        bookerPhone: row.booking_booker_phone,
        bookingNumber: row.booking_number,
        internalNote: row.booking_internal_note,
        kind: "admin" as const,
        participantCount: row.booking_participant_count,
        practicalNotes: row.booking_practical_notes,
        price: bookingPriceOverview(row),
        status: row.booking_status,
      },
    ])
  );
}
