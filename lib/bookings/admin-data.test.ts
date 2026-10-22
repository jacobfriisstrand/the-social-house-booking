import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  type AdminFilterOptions,
  type AdminOverviewFilter,
  listAdminBookings,
} from "./admin-data";

// The mapper meets the database only through the PostgREST builder chain,
// so the fake stands in for the client at that seam: every chained method
// returns the builder, and awaiting it resolves the fixture rows for the
// queried table (the style lib/outlook/sync.test.ts uses). listAdminBookings
// also reads the admins registry through adminDisplayNames, so the fake
// serves both tables. The tests assert the domain rows the mapper returns —
// never the SQL it builds.
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

// The admin overview query's row shape (admin-data.ts's private
// AdminBookingQueryRow): the frozen snapshot columns plus the embeds the
// joins return — companies and rooms both nullable, because under a
// membership filter PostgREST can answer with the embeds stripped.
interface AdminBookingQueryRow {
  booking_addon_total_ore: number;
  booking_addons: Array<{
    addons: { addon_description: string | null; addon_name: string } | null;
    booking_addon_addon_id: string;
    booking_addon_quantity: number;
    booking_addon_total_ore: number;
  }> | null;
  booking_booker_email: string | null;
  booking_booker_name: string | null;
  booking_booker_phone: string | null;
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_cancelled_at: string | null;
  booking_company_id: string;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_id: string;
  booking_invoice_date: string | null;
  booking_invoice_number: string | null;
  booking_invoicing_status: string;
  booking_number: string;
  booking_participant_count: number;
  booking_practical_notes: string | null;
  booking_room_price_ore: number;
  booking_start_at: string;
  booking_status: string;
  companies: {
    company_display_name: string;
    company_id: string;
    company_membership_status: string;
  } | null;
  manual_amounts: Array<{
    manual_amount_amount_ore: number;
    manual_amount_created_at: string;
    manual_amount_created_by?: string | null;
    manual_amount_id: string;
    manual_amount_note: string;
  }> | null;
  rooms: { room_id: string; room_name: string } | null;
}

const bookingId = "00000000-0000-0000-0000-0000000000b1";
const companyId = "00000000-0000-0000-0000-0000000000c1";
const roomId = "00000000-0000-0000-0000-0000000000r1";

const addonLine = (
  overrides: Partial<
    NonNullable<AdminBookingQueryRow["booking_addons"]>[number]
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
    NonNullable<AdminBookingQueryRow["manual_amounts"]>[number]
  > = {}
) => ({
  manual_amount_amount_ore: 25_000,
  manual_amount_created_at: "2026-09-01T10:00:00.000Z",
  manual_amount_created_by: "00000000-0000-0000-0000-0000000000u1",
  manual_amount_id: "00000000-0000-0000-0000-0000000000m1",
  manual_amount_note: "Ekstra strøm",
  ...overrides,
});

const adminRow = (
  overrides: Partial<AdminBookingQueryRow> = {}
): AdminBookingQueryRow => ({
  booking_addon_total_ore: 50_000,
  booking_addons: null,
  booking_booker_email: "anna@virksomhed.dk",
  booking_booker_name: "Anna Booker",
  booking_booker_phone: "+45 20 30 40 50",
  booking_cancellation_fee_ore: null,
  booking_cancellation_fee_waived: false,
  booking_cancelled_at: null,
  booking_company_id: companyId,
  booking_discount_percent: 0,
  booking_end_at: "2026-09-02T19:00:00Z",
  booking_expected_total_ore: 62_500,
  booking_id: bookingId,
  booking_invoice_date: null,
  booking_invoice_number: null,
  booking_invoicing_status: "not_invoiced",
  booking_number: "TB-2026-0001",
  booking_participant_count: 8,
  booking_practical_notes: null,
  booking_room_price_ore: 62_500,
  booking_start_at: "2026-09-02T17:00:00Z",
  booking_status: "confirmed",
  companies: {
    company_display_name: "Ærø ApS",
    company_id: companyId,
    company_membership_status: "member",
  },
  manual_amounts: null,
  rooms: { room_id: roomId, room_name: "Lokalet" },
  ...overrides,
});

const filter = (
  overrides: Partial<AdminOverviewFilter> = {}
): AdminOverviewFilter & { options: AdminFilterOptions } => ({
  bookingStates: [],
  companyIds: [],
  invoicingStatuses: [],
  memberships: [],
  now: new Date("2026-09-02T12:00:00Z"),
  options: { companies: [], rooms: [] },
  roomIds: [],
  worklist: false,
  ...overrides,
});

const listRows = async (rows: AdminBookingQueryRow[]) =>
  listAdminBookings(
    fakeClient({
      admins: [
        {
          admin_auth_user_id: "00000000-0000-0000-0000-0000000000u1",
          admin_display_name: "Annette Admin",
        },
      ],
      bookings: rows,
    }),
    filter()
  );

describe("listAdminBookings", () => {
  it("maps one confirmed booking to its admin row", async () => {
    expect(
      await listRows([
        adminRow({
          booking_addons: [addonLine()],
          manual_amounts: [manualAmount()],
        }),
      ])
    ).toEqual([
      {
        addOns: [
          {
            addonId: "00000000-0000-0000-0000-0000000000a1",
            description: "Opsætning og afvikling",
            name: "Room reset",
            quantity: 2,
            totalOre: 50_000,
          },
        ],
        addonTotalOre: 50_000,
        bookerEmail: "anna@virksomhed.dk",
        bookerName: "Anna Booker",
        bookerPhone: "+45 20 30 40 50",
        bookingId,
        bookingNumber: "TB-2026-0001",
        bookingStatus: "confirmed",
        cancellationFeeOre: null,
        cancellationFeeWaived: false,
        cancelledAt: null,
        companyId,
        companyName: "Ærø ApS",
        discountPercent: 0,
        endAt: "2026-09-02T19:00:00Z",
        expectedTotalOre: 62_500,
        invoiceDate: null,
        invoiceNumber: null,
        invoicingStatus: "not_invoiced",
        manualAmounts: [
          {
            amountOre: 25_000,
            createdAt: "2026-09-01T10:00:00.000Z",
            createdByName: "Annette Admin",
            manualAmountId: "00000000-0000-0000-0000-0000000000m1",
            note: "Ekstra strøm",
          },
        ],
        manualAmountsOre: 25_000,
        membershipStatus: "member",
        participants: 8,
        practicalNotes: null,
        roomId,
        roomName: "Lokalet",
        roomPriceOre: 62_500,
        startAt: "2026-09-02T17:00:00Z",
      },
    ]);
  });

  it("throws when the room join is missing", async () => {
    await expect(listRows([adminRow({ rooms: null })])).rejects.toThrow(
      `booking ${bookingId} is missing its room`
    );
  });

  it("throws when the company name join is missing", async () => {
    await expect(listRows([adminRow({ companies: null })])).rejects.toThrow(
      `booking ${bookingId} is missing its company`
    );
  });

  it("maps a booking_addons join of null to no add-on lines", async () => {
    const [row] = await listRows([adminRow()]);
    expect(row?.addOns).toEqual([]);
    // The add-on total stays the frozen snapshot column, not the line list.
    expect(row?.addonTotalOre).toBe(50_000);
  });

  it("keeps a waived fee's flag and frozen amount for the admin surfaces", async () => {
    const [row] = await listRows([
      adminRow({
        booking_cancellation_fee_ore: 25_000,
        booking_cancellation_fee_waived: true,
        booking_cancelled_at: "2026-09-01T09:00:00Z",
        booking_status: "cancelled",
      }),
    ]);
    expect(row?.cancellationFeeOre).toBe(25_000);
    expect(row?.cancellationFeeWaived).toBe(true);
    expect(row?.cancelledAt).toBe("2026-09-01T09:00:00Z");
    expect(row?.bookingStatus).toBe("cancelled");
  });

  it("carries the invoice fields when the booking is invoiced", async () => {
    const [row] = await listRows([
      adminRow({
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
