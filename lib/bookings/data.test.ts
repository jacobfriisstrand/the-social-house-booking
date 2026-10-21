import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { listOwnBookingOverview } from "./data";

// data.ts reaches the cancellation module for the live fee, and that
// import chain passes lib/env's boot-time validation, which no unit test
// needs (the fee computation itself is pure).
vi.mock("@/lib/env", () => ({ env: {}, isDevelopment: true }));

// The mapper meets the database only through the PostgREST builder chain,
// so the fake stands in for the client at that seam: every chained method
// returns the builder, and awaiting it resolves the fixture rows for the
// queried table (the style lib/outlook/sync.test.ts uses). The tests
// assert the domain rows the mapper returns — never the SQL it builds.
const fakeClient = (
  tables: Record<string, object[]>
): SupabaseClient<Database> => {
  const build = (rows: object[]) => {
    const builder = {
      eq: () => builder,
      gt: () => builder,
      gte: () => builder,
      in: () => builder,
      limit: () => builder,
      lt: () => builder,
      or: () => builder,
      order: () => builder,
      select: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: the fake must be awaitable, like the real PostgREST builder it stands in for.
      then: (
        resolve: (result: { data: object[] | null; error: null }) => void
      ) => {
        resolve({ data: rows, error: null });
      },
    };
    return builder;
  };
  return {
    from: (table: string) => build(tables[table] ?? []),
  } as unknown as SupabaseClient<Database>;
};

// The overview query's row shape (data.ts's private BookingRow): the
// frozen snapshot columns (ADR-0005) plus the embeds the join returns.
// Instants are relative to the test's own clock, because the mapper reads
// its clock inside.
interface OwnBookingQueryRow {
  booking_addon_total_ore: number;
  booking_addons: Array<{
    addons: { addon_description: string | null; addon_name: string } | null;
    booking_addon_addon_id: string;
    booking_addon_quantity: number;
    booking_addon_total_ore: number;
  }> | null;
  booking_booker_name: string;
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_cancelled_at: string | null;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_hold_expires_at: string | null;
  booking_id: string;
  booking_invoice_date: string | null;
  booking_invoice_number: string | null;
  booking_invoicing_status: string;
  booking_number: string;
  booking_room_id: string;
  booking_room_price_ore: number;
  booking_start_at: string;
  booking_status: string;
  manual_amounts: Array<{
    manual_amount_amount_ore: number;
    manual_amount_created_at: string;
    manual_amount_id: string;
    manual_amount_note: string;
  }> | null;
  rooms: { room_name: string } | null;
}

const hourMs = 3_600_000;
const hoursFromNow = (hours: number): string =>
  new Date(Date.now() + hours * hourMs).toISOString();

const in24Hours = hoursFromNow(24);
const in30Days = hoursFromNow(30 * 24);
const in48Hours = hoursFromNow(48);
const in50Hours = hoursFromNow(50);
const oneHourAgo = hoursFromNow(-1);
const threeHoursAgo = hoursFromNow(-3);

const addonLine = (
  overrides: Partial<
    NonNullable<OwnBookingQueryRow["booking_addons"]>[number]
  > = {}
) => ({
  addons: {
    addon_description: "Opsætning og afvikling",
    addon_name: "Room reset",
  },
  booking_addon_addon_id: "00000000-0000-0000-0000-0000000000a1",
  booking_addon_quantity: 2,
  booking_addon_total_ore: 50_000,
  ...overrides,
});

const manualAmount = (
  overrides: Partial<
    NonNullable<OwnBookingQueryRow["manual_amounts"]>[number]
  > = {}
) => ({
  manual_amount_amount_ore: 25_000,
  manual_amount_created_at: "2026-09-01T10:00:00.000Z",
  manual_amount_id: "00000000-0000-0000-0000-0000000000m1",
  manual_amount_note: "Ekstra strøm",
  ...overrides,
});

// One confirmed booking 48 hours ahead: inside the 50 % fee tier
// (ADR-0006) on the member price 62 500 øre, so the live fee of 31 250
// proves the computation ran at load.
const bookingRow = (
  overrides: Partial<OwnBookingQueryRow> = {}
): OwnBookingQueryRow => ({
  booking_addon_total_ore: 50_000,
  booking_addons: [addonLine()],
  booking_booker_name: "Anna Booker",
  booking_cancellation_fee_ore: null,
  booking_cancellation_fee_waived: false,
  booking_cancelled_at: null,
  booking_discount_percent: 0,
  booking_end_at: in50Hours,
  booking_expected_total_ore: 62_500,
  booking_hold_expires_at: null,
  booking_id: "00000000-0000-0000-0000-0000000000b1",
  booking_invoice_date: null,
  booking_invoice_number: null,
  booking_invoicing_status: "not_invoiced",
  booking_number: "TB-2026-0001",
  booking_room_id: "00000000-0000-0000-0000-0000000000r1",
  booking_room_price_ore: 62_500,
  booking_start_at: in48Hours,
  booking_status: "confirmed",
  manual_amounts: [manualAmount()],
  rooms: { room_name: "Lokalet" },
  ...overrides,
});

const cancelledRow = (overrides: Partial<OwnBookingQueryRow> = {}) =>
  bookingRow({
    booking_cancelled_at: "2026-09-01T09:00:00Z",
    booking_end_at: oneHourAgo,
    booking_start_at: threeHoursAgo,
    booking_status: "cancelled",
    ...overrides,
  });

const listRows = async (rows: OwnBookingQueryRow[]) =>
  listOwnBookingOverview(fakeClient({ bookings: rows }), "c1");

describe("listOwnBookingOverview", () => {
  it("maps one confirmed upcoming booking to its domain row", async () => {
    const line = {
      addonId: "00000000-0000-0000-0000-0000000000a1",
      description: "Opsætning og afvikling",
      name: "Room reset",
      quantity: 2,
      totalOre: 50_000,
    };
    expect(await listRows([bookingRow()])).toEqual([
      {
        addOns: [line],
        bookerName: "Anna Booker",
        bookingHoldExpiresAt: null,
        bookingId: "00000000-0000-0000-0000-0000000000b1",
        bookingNumber: "TB-2026-0001",
        bookingStartAt: in48Hours,
        bookingStatus: "confirmed",
        cancellationFeeOre: null,
        cancelledAt: null,
        endAt: in50Hours,
        invoiceDate: null,
        invoiceNumber: null,
        invoicingStatus: "not_invoiced",
        liveCancellationFeeOre: 31_250,
        price: {
          addOnLines: [line],
          addOnsOre: 50_000,
          discountPercent: 0,
          manualAmounts: [
            {
              amountOre: 25_000,
              createdAt: "2026-09-01T10:00:00.000Z",
              createdByName: null,
              manualAmountId: "00000000-0000-0000-0000-0000000000m1",
              note: "Ekstra strøm",
            },
          ],
          roomMemberTotalOre: 62_500,
          roomNormalTotalOre: 62_500,
          savingsOre: 0,
          showSavings: false,
          totalOre: 87_500,
        },
        roomId: "00000000-0000-0000-0000-0000000000r1",
        roomName: "Lokalet",
      },
    ]);
  });

  it("throws when the room join is missing", async () => {
    await expect(listRows([bookingRow({ rooms: null })])).rejects.toThrow(
      "booking room 00000000-0000-0000-0000-0000000000r1 was not found"
    );
  });

  it("maps a booking_addons join of null to no add-on lines", async () => {
    const [row] = await listRows([bookingRow({ booking_addons: null })]);
    expect(row?.addOns).toEqual([]);
    // The totals stay the frozen snapshot columns, not the line list.
    expect(row?.price.addOnsOre).toBe(50_000);
  });

  it("maps an add-on without its catalogue join to a nameless line", async () => {
    const [row] = await listRows([
      bookingRow({ booking_addons: [addonLine({ addons: null })] }),
    ]);
    expect(row?.addOns).toEqual([
      {
        addonId: "00000000-0000-0000-0000-0000000000a1",
        description: null,
        name: null,
        quantity: 2,
        totalOre: 50_000,
      },
    ]);
  });

  it("reads a waived fee as no fee, keeping the cancellation instant", async () => {
    const [row] = await listRows([
      cancelledRow({
        booking_cancellation_fee_ore: 25_000,
        booking_cancellation_fee_waived: true,
      }),
    ]);
    expect(row?.cancellationFeeOre).toBeNull();
    expect(row?.cancelledAt).toBe("2026-09-01T09:00:00Z");
    expect(row?.liveCancellationFeeOre).toBeNull();
  });

  it("keeps a cancelled booking's stored fee with no live fee", async () => {
    const [row] = await listRows([
      cancelledRow({ booking_cancellation_fee_ore: 25_000 }),
    ]);
    expect(row?.cancellationFeeOre).toBe(25_000);
    expect(row?.liveCancellationFeeOre).toBeNull();
  });

  it("computes no live fee for a past booking or a standing hold", async () => {
    const rows = await listRows([
      bookingRow({
        booking_end_at: oneHourAgo,
        booking_id: "00000000-0000-0000-0000-0000000000b2",
        booking_start_at: threeHoursAgo,
      }),
      bookingRow({
        booking_hold_expires_at: in24Hours,
        booking_id: "00000000-0000-0000-0000-0000000000b3",
        booking_start_at: in30Days,
        booking_status: "pending_verification",
      }),
    ]);
    expect(rows[0]?.liveCancellationFeeOre).toBeNull();
    expect(rows[1]?.liveCancellationFeeOre).toBeNull();
    expect(rows[1]?.bookingHoldExpiresAt).toBe(in24Hours);
  });

  it("carries the invoice fields when the booking is invoiced", async () => {
    const [row] = await listRows([
      bookingRow({
        booking_invoice_date: "2026-09-03",
        booking_invoice_number: "BS-1042",
        booking_invoicing_status: "invoiced",
      }),
    ]);
    expect(row?.invoicingStatus).toBe("invoiced");
    expect(row?.invoiceNumber).toBe("BS-1042");
    expect(row?.invoiceDate).toBe("2026-09-03");
  });
});
