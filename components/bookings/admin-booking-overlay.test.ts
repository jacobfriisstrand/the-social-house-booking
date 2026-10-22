// The overlay state machine the table and the calendar share (#153):
// which of detail/edit is open for which Booking, and which Booking the
// cancel confirm shows. One Booking at a time — a new open replaces the
// old one, the id list is the trigger so a sort re-read keeps the sheet,
// and a close keeps the picked row behind the exit animation.
import { describe, expect, it } from "vitest";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";

import {
  closeAdminCancel,
  closeAdminOverlay,
  openAdminCancel,
  openAdminOverlay,
  overlayRowById,
  overlayRows,
} from "./admin-booking-overlay";

const row = (bookingId: string): AdminBookingRow =>
  ({
    bookingId,
    bookingNumber: `B-2610-${bookingId}`,
    bookingStatus: "confirmed",
    invoicingStatus: "not_invoiced",
  }) as AdminBookingRow;

const rows = [row("b1"), row("b2")];

describe("openAdminOverlay", () => {
  it("opens a booking's detail sheet, closed state cleared", () => {
    const closed = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );

    expect(closed).toEqual({
      cancelId: null,
      overlay: { bookingId: "b1", kind: "detail" },
      overlayOpen: true,
    });
  });

  it("replaces a detail sheet with the edit sheet of another booking", () => {
    const detail = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );
    const edit = openAdminOverlay(detail, "b2", "edit");

    expect(edit).toEqual({
      cancelId: null,
      overlay: { bookingId: "b2", kind: "edit" },
      overlayOpen: true,
    });
  });

  it("re-opening the same booking keeps the trigger", () => {
    const first = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );
    const again = openAdminOverlay(first, "b1", "detail");

    expect(again).toEqual({
      cancelId: null,
      overlay: { bookingId: "b1", kind: "detail" },
      overlayOpen: true,
    });
  });
});

describe("closeAdminOverlay", () => {
  it("closes the sheet and keeps the picked row for the exit animation", () => {
    const open = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );
    const closed = closeAdminOverlay(open, false);

    expect(closed).toEqual({
      cancelId: null,
      overlay: { bookingId: "b1", kind: "detail" },
      overlayOpen: false,
    });
  });

  it("ignores open: true — the sheet's onOpenChange only means a close", () => {
    const open = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );

    expect(closeAdminOverlay(open, true)).toEqual(open);
  });
});

describe("openAdminCancel and closeAdminCancel", () => {
  it("picks the booking to cancel over an open detail sheet", () => {
    const detail = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );
    const cancelling = openAdminCancel(detail, "b1");

    expect(cancelling).toEqual({
      cancelId: "b1",
      overlay: { bookingId: "b1", kind: "detail" },
      overlayOpen: true,
    });
  });

  it("clears the pick, leaving the detail sheet alone", () => {
    const detail = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );
    const cancelled = closeAdminCancel(openAdminCancel(detail, "b1"));

    expect(cancelled).toEqual({
      cancelId: null,
      overlay: { bookingId: "b1", kind: "detail" },
      overlayOpen: true,
    });
  });
});

describe("overlayRowById", () => {
  it("picks the row behind an open overlay, and null when none", () => {
    const open = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "detail"
    );

    expect(overlayRowById(rows, open.overlay)).toMatchObject({
      bookingId: "b1",
    });
    expect(overlayRowById(rows, null)).toBeNull();
  });

  it("returns null for a Booking that vanished from the rows", () => {
    const open = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b3",
      "detail"
    );

    expect(overlayRowById(rows, open.overlay)).toBeNull();
  });

  it("never mixes kinds — the edit pick does not light the detail sheet", () => {
    const edit = openAdminOverlay(
      { cancelId: null, overlay: null, overlayOpen: false },
      "b1",
      "edit"
    );

    expect(overlayRowById(rows, edit.overlay)).toMatchObject({
      bookingId: "b1",
    });
  });
});

describe("overlayRows", () => {
  it("resolves every kind's row live from the current rows", () => {
    const state = {
      ...openAdminOverlay(
        openAdminCancel(
          openAdminOverlay(
            { cancelId: null, overlay: null, overlayOpen: false },
            "b1",
            "detail"
          ),
          "b2"
        ),
        "b2",
        "edit"
      ),
    };

    expect(overlayRows(rows, state)).toEqual({
      cancelRow: rows[1],
      detailRow: null,
      editRow: rows[1],
    });
  });

  it("returns null rows for an empty overlay", () => {
    expect(
      overlayRows(rows, { cancelId: null, overlay: null, overlayOpen: false })
    ).toEqual({
      cancelRow: null,
      detailRow: null,
      editRow: null,
    });
  });
});
