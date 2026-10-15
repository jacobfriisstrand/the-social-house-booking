// The day grid's empty cells: only "available" slots open the booking
// dialog, and a non-bookable slot (past, closed, blocked) must be visibly
// muted and labelled like the dialog's disabled start options — not a
// blank cell that looks bookable but does nothing.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DialogRoom } from "@/components/bookings/booking-form";
import type { BookingViewer } from "@/lib/bookings/viewer";
import type { StartSlotStatus } from "@/lib/domain/availability";
import type { PlacedCell } from "@/lib/domain/day-grid";

// The component's import chain reaches lib/supabase/server, which asserts
// the environment at module load; the grid renders without a client, so
// stub the seam the way the auth action tests do.
vi.mock("@/lib/env", () => ({
  env: {
    APP_ENV: "development",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => null }));

import { DayGrid } from "./day-grid";

const room: DialogRoom = {
  addons: [],
  capacity: 8,
  hourlyPriceOre: 35_000,
  location: null,
  name: "Room of Ideas",
  roomId: "r1",
  specialDays: [],
  weekly: [],
};

const viewer: BookingViewer = { discountPercent: 0, kind: "company" };

const slotCell = (
  row: number,
  label: string,
  status: StartSlotStatus
): PlacedCell => ({
  cell: { firstRow: row, kind: "slot", label, rowSpan: 1, status },
  column: 0,
});

const renderGrid = (cells: PlacedCell[]): string =>
  renderToStaticMarkup(
    <DayGrid
      columns={[{ periods: [], room, status: null }]}
      date="2026-10-08"
      dateLabel="torsdag den 8. oktober 2026"
      entries={{}}
      rows={cells.map((cell) => [cell])}
      terms={{}}
      viewer={viewer}
    />
  );

describe("DayGrid slot cells", () => {
  it("renders a non-bookable slot muted, labelled and without a button", () => {
    const html = renderGrid([
      slotCell(0, "09:00", "past"),
      slotCell(1, "09:30", "available"),
    ]);
    // Muted fill with the diagonal hatch plus the reason, mirroring the
    // dialog's disabled start options; the "bg-muted " prefix keeps
    // bg-muted/50 header cells from matching.
    expect(html).toContain("bg-muted [background-image");
    expect(html).toContain("Passeret");
    // One clickable cell only: the available slot, labelled like the copy.
    expect(html.match(/<button/g)?.length).toBe(1);
    expect(html).toContain('aria-label="Book Room of Ideas kl. 09:30"');
  });
});
