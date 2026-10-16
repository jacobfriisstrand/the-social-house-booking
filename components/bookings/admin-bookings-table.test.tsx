// The loading table: a filter, sort or view change re-reads the server,
// and while it does the list shows skeleton rows — never the stale rows,
// the pagination footer or the empty state (the empty state waits until
// the read lands and can say there is nothing).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseAdminViewParams } from "@/lib/bookings/admin-view-params";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { messages } from "@/messages/da";

// The component's import chain reaches the server action's client, which
// asserts the environment at module load; the table renders without a
// client, so stub the seam the way the day-grid tests do.
vi.mock("@/lib/env", () => ({
  env: {
    APP_ENV: "development",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => null }));
// The component reaches for the app router (a mark triggers router.refresh
// after the action); the static render has no router to mount.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  // The pagination hook reads ?page and ?pageSize.
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminBookingsTable } from "./admin-bookings-table";

const copy = messages.bookings.admin;
const params = parseAdminViewParams({}, "2026-10-13");
const noop = () => undefined;

// One real row: the loading list replaces it with skeletons, and the
// footer's summary only renders for a non-empty set.
const row: AdminBookingRow = {
  addOns: [],
  addonTotalOre: 0,
  bookingId: "b1",
  bookingNumber: "B-2610-0001",
  bookingStatus: "confirmed",
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  cancelledAt: null,
  companyId: "c1",
  companyName: "Rituals",
  discountPercent: 0,
  endAt: "2026-10-13T10:00:00Z",
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced",
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member",
  practicalNotes: null,
  roomId: "r1",
  roomName: "Room of Ideas",
  roomPriceOre: 100_000,
  startAt: "2026-10-13T08:00:00Z",
};

describe("AdminBookingsTable loading", () => {
  it("renders skeleton rows and the footer, not the empty state, while loading", () => {
    const html = renderToStaticMarkup(
      <AdminBookingsTable
        loading
        onParamChange={noop}
        params={params}
        rows={[row]}
      />
    );
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain(copy.emptyTitle);
    // The stale row is replaced, not dimmed underneath.
    expect(html).not.toContain(row.bookingNumber);
    // The footer stays: its counts are stale but the card's height holds.
    expect(html).toContain("Viser");
  });

  it("shows the empty state, and no skeletons, when idle without rows", () => {
    const html = renderToStaticMarkup(
      <AdminBookingsTable
        loading={false}
        onParamChange={noop}
        params={params}
        rows={[]}
      />
    );
    expect(html).toContain(copy.emptyTitle);
    expect(html).not.toContain('data-slot="skeleton"');
  });
});
