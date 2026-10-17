import { describe, expect, it, vi } from "vitest";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { cphDate } from "@/lib/domain/opening-hours";

// Pins the route's wiring: the admin check (401 without a session, 403
// without the role), the URL's filters riding into listAdminBookings, and
// the table's own sort applied before the CSV builds. The CSV cells are
// admin-export.test.ts's subject; here the header line and the row order
// prove the body is that module's output of the sorted rows.
const state = vi.hoisted(() => ({
  filter: undefined as Record<string, unknown> | undefined,
  rows: [] as AdminBookingRow[],
  session: null as null | { appRole?: string; email: string; userId: string },
}));

vi.mock("@/lib/auth/get-session", () => ({
  getSession: () => state.session,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));
vi.mock("@/lib/bookings/admin-data", () => ({
  listAdminBookings: (_supabase: unknown, filter: unknown) => {
    state.filter = filter as Record<string, unknown>;
    return state.rows;
  },
  listAdminFilterOptions: () => ({ companies: [], rooms: [] }),
}));
vi.mock("@/lib/export/pdf", () => ({
  renderTablePdf: () => Buffer.from("%PDF-123"),
}));

import { GET, POST } from "./route";

const row = (overrides: Partial<AdminBookingRow>): AdminBookingRow => ({
  addOns: [],
  addonTotalOre: 0,
  bookerEmail: null,
  bookerName: null,
  bookerPhone: null,
  bookingId: "b",
  bookingNumber: "TB-2026-0001",
  bookingStatus: "confirmed",
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  cancelledAt: null,
  companyId: "c",
  companyName: "Firma",
  discountPercent: 0,
  endAt: "2026-09-02T19:00:00Z",
  expectedTotalOre: 62_500,
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced",
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member",
  participants: 8,
  practicalNotes: null,
  roomId: "r",
  roomName: "Lokale",
  roomPriceOre: 62_500,
  startAt: "2026-09-02T17:00:00Z",
  ...overrides,
});

const get = (search = ""): Promise<Response> =>
  GET(new Request(`http://x/admin/bookings/export${search}`));

describe("bookings export route", () => {
  it("refuses a visitor with 401", async () => {
    state.session = null;
    expect((await get()).status).toBe(401);
  });

  it("refuses a non-admin session with 403", async () => {
    state.session = { appRole: undefined, email: "x@y.dk", userId: "u" };
    expect((await get()).status).toBe(403);
  });

  it("streams the sorted rows as a CSV attachment", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.rows = [
      row({ bookingNumber: "TB-2026-0002" }),
      row({ bookingNumber: "TB-2026-0001", startAt: "2026-09-01T17:00:00Z" }),
    ];
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8"
    );
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="bookinger-${cphDate(new Date())}.csv"`
    );
    const lines = (await response.text()).split("\r\n");
    expect(lines[0].replace("\uFEFF", "")).toBe(
      "Status;Aflyst;Bookingnummer;Virksomhed;Lokale;Start;Slut;Deltagere;Tilkøb;Total pris (Efter rabat)"
    );
    // The table's default sort: start order ascending.
    expect(lines[1].includes("TB-2026-0001")).toBe(true);
    expect(lines[2].includes("TB-2026-0002")).toBe(true);
  });

  it("carries the URL's filters into the read", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    await get("?periodFrom=2026-09-01&periodTo=2026-09-30&room=r1&room=r2");
    expect(state.filter?.periodFrom).toBe("2026-09-01");
    expect(state.filter?.periodTo).toBe("2026-09-30");
    expect(state.filter?.roomIds).toEqual(["r1", "r2"]);
  });

  it("streams a PDF when the format asks for it", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.rows = [row({})];
    const response = await get("?format=pdf");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="bookinger-${cphDate(new Date())}.pdf"`
    );
    expect(await response.text()).toContain("%PDF-123");
  });
});

describe("bookings export route (POST)", () => {
  const guid = (n: number): string =>
    `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

  const post = (body: unknown): Promise<Response> =>
    POST(
      new Request("http://x/admin/bookings/export", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

  it("refuses a visitor with 401", async () => {
    state.session = null;
    expect((await post({ bookingIds: [guid(1)], format: "csv" })).status).toBe(
      401
    );
  });

  it("refuses a non-admin session with 403", async () => {
    state.session = { appRole: undefined, email: "x@y.dk", userId: "u" };
    expect((await post({ bookingIds: [guid(1)], format: "csv" })).status).toBe(
      403
    );
  });

  it("rejects a malformed body with 400", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    expect((await post({ bookingIds: [], format: "csv" })).status).toBe(400);
    expect((await post({ bookingIds: [guid(1)], format: "xlsx" })).status).toBe(
      400
    );
  });

  it("streams exactly the posted bookings, in the posted order", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.rows = [
      row({ bookingId: guid(2), bookingNumber: "TB-2026-0002" }),
      row({ bookingId: guid(1), bookingNumber: "TB-2026-0001" }),
    ];
    const response = await post({
      bookingIds: [guid(1), guid(2)],
      format: "csv",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="bookinger-${cphDate(new Date())}.csv"`
    );
    expect(state.filter?.bookingIds).toEqual([guid(1), guid(2)]);
    const lines = (await response.text()).split("\r\n");
    expect(lines[1].includes("TB-2026-0001")).toBe(true);
    expect(lines[2].includes("TB-2026-0002")).toBe(true);
  });

  it("drops a posted id the read cannot see, keeps the rest", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.rows = [row({ bookingId: guid(2), bookingNumber: "TB-2026-0002" })];
    const lines = (
      await (
        await post({ bookingIds: [guid(9), guid(2)], format: "csv" })
      ).text()
    ).split("\r\n");
    expect(lines.length).toBe(3);
    expect(lines[1].includes("TB-2026-0002")).toBe(true);
  });

  it("streams a PDF when the format asks for it", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.rows = [row({ bookingId: guid(1) })];
    const response = await post({ bookingIds: [guid(1)], format: "pdf" });
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(await response.text()).toContain("%PDF-123");
  });
});
