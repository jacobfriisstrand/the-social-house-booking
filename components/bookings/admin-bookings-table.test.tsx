// @vitest-environment happy-dom
// The loading table: a filter, sort or view change re-reads the server,
// and while it does the list shows skeleton rows — never the stale rows,
// the pagination footer or the empty state (the empty state waits until
// the read lands and can say there is nothing).
//
// The interaction tests tick real checkboxes, open the real menus and
// submit the real dialog — the user-visible outcomes through the table's
// interface (#154). The actions and the router are stubbed at their
// seams: the server action resolves, the router refreshes in place.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// The server actions the table reaches: the invoicing status moves (the
// row menu and the bulk header) and the bulk invoice mark. Each mock
// resolves success so the toasts fire and the selection clears; the rest
// parameter lets the wrapper spread any argument shape the action takes.
const moveStatus = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ status: "success" })
);
const markInvoiced = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ status: "success" })
);
const cancelBooking = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ feeOre: 0, status: "cancelled" })
);
vi.mock("@/lib/bookings/invoicing-actions", () => ({
  markBookingsInvoiced: (...args: unknown[]) => markInvoiced(...args),
  setBookingsInvoicingStatus: (...args: unknown[]) => moveStatus(...args),
}));
vi.mock("@/lib/bookings/admin-cancel-actions", () => ({
  cancelBookingAsAdmin: (...args: unknown[]) => cancelBooking(...args),
}));

// The router stub keeps the table's router use inert outside Next: the
// status-move path refreshes through it, the dialog path closes and
// clears the selection instead — none of these tests drive a refresh.
const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: routerRefresh }),
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
  bookerEmail: null,
  bookerName: null,
  bookerPhone: null,
  bookingId: "00000000-0000-0000-0000-000000000001",
  bookingNumber: "B-2610-0001",
  bookingStatus: "confirmed",
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  cancelledAt: null,
  companyId: "c1",
  companyName: "Rituals",
  discountPercent: 0,
  endAt: "2026-10-13T10:00:00Z",
  expectedTotalOre: 100_000,
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced",
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member",
  participants: 8,
  practicalNotes: null,
  roomId: "r1",
  roomName: "Room of Ideas",
  roomPriceOre: 100_000,
  startAt: "2026-10-13T08:00:00Z",
};

// The second booking stands out from `row` on every identity field, so
// an assertion that hit the wrong row's data fails loudly.
const nordicRow: AdminBookingRow = {
  ...row,
  bookingId: "00000000-0000-0000-0000-000000000002",
  bookingNumber: "B-2610-0002",
  companyId: "c2",
  companyName: "Nordic Events",
  expectedTotalOre: 50_000,
  roomId: "r2",
  roomName: "Room of Requirements",
};

// The third booking is never ticked: the bulk action's payload must carry
// exactly the ticked ids, so an unticked id has to exist for the assert
// to have a negative control.
const torvetRow: AdminBookingRow = {
  ...row,
  bookingId: "00000000-0000-0000-0000-000000000003",
  bookingNumber: "B-2610-0003",
  companyId: "c3",
  companyName: "Torvet",
  expectedTotalOre: 25_000,
  roomId: "r3",
  roomName: "Room of Echoes",
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

// The interaction harness: React 19's client root on the document body,
// unmounted after each test so the portals clear. The rows differ only in
// the fields the test asserts on — the second booking's id, number,
// company and room stand out so the wrong row's action fails the assert.
// The root sits on document.body, not a wrapper div: the dialogs and
// sheets portal there, and an event must bubble to the root container for
// React to see it — a wrapper div would miss every portal event.
let root: Root;

const renderTable = (rows: AdminBookingRow[]) => {
  act(() => {
    root.render(
      <AdminBookingsTable
        loading={false}
        onParamChange={noop}
        params={params}
        rows={rows}
      />
    );
  });
  return document.body;
};

const tickRow = (bookingNumber: string) => {
  const tick = document.querySelector<HTMLButtonElement>(
    `[aria-label="${copy.selection.selectRow(bookingNumber)}"]`
  );
  if (!tick) {
    throw new Error(`Tick button for "${bookingNumber}" not found`);
  }
  act(() => {
    tick.click();
  });
};

// Opens the row's ⋯ menu: the trigger carries the booking number, so the
// wrong row's menu cannot be confused with the right one.
const openRowMenu = (bookingNumber: string) => {
  const trigger = document.querySelector<HTMLButtonElement>(
    `[aria-label="${copy.actions.open(bookingNumber)}"]`
  );
  if (!trigger) {
    throw new Error(`Row menu for "${bookingNumber}" not found`);
  }
  act(() => {
    trigger.click();
  });
};

// One open menu's item by its exact label; a missing item throws instead
// of clicking undefined and passing silently.
const menuItem = (label: string) => {
  const item = [
    ...document.body.querySelectorAll<HTMLElement>("[role='menuitem']"),
  ].find((candidate) => candidate.textContent === label);
  if (!item) {
    throw new Error(`Menu item "${label}" not found`);
  }
  return item;
};

// The header's bulk "Markér som faktureret" button — it stands where the
// column titles were once rows are ticked.
const bulkButton = () => {
  const button = [...document.body.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === copy.markInvoiced.button
  );
  if (!button) {
    throw new Error("Bulk mark-invoiced button not found");
  }
  return button;
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = "";
  root = createRoot(document.body);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
});

describe("AdminBookingsTable interactions", () => {
  it("ticks a row and the header total counts only the ticked rows", () => {
    const body = renderTable([row, nordicRow]);

    // The cash-flow card above the table starts on the filtered set: both
    // bookings are invoice-ready, so the total reads 1.500,00 kr.
    expect(body.textContent).toContain(copy.cashFlow.title);
    expect(body.textContent).toContain("1.500,00 kr");

    // Tick the first row: the total drops to that row's basis alone —
    // the other booking's 500 kr must not stay in the sum.
    tickRow("B-2610-0001");

    expect(body.textContent).toContain("1.000,00 kr");
    expect(body.textContent).not.toContain("1.500,00 kr");
  });

  it("opens the bulk mark-invoiced dialog for the ticked rows", () => {
    renderTable([row, nordicRow]);

    tickRow("B-2610-0001");
    tickRow("B-2610-0002");

    act(() => {
      bulkButton().click();
    });

    // The dialog labels the batch with the company names, not the raw ids.
    expect(document.body.textContent).toContain("Rituals");
    expect(document.body.textContent).toContain("Nordic Events");
  });

  it("submits the bulk mark-invoiced action with exactly the ticked ids", async () => {
    renderTable([row, nordicRow, torvetRow]);

    tickRow("B-2610-0001");
    tickRow("B-2610-0002");

    act(() => {
      bulkButton().click();
    });

    // The dialog's date is preselected; each company's number field is
    // the only one the admin must write in company mode. The value goes
    // through the native setter — React's value tracker ignores a direct
    // `.value` write, so the change event would not reach the form.
    for (const [companyId, number] of [
      ["c1", "INV-001"],
      ["c2", "INV-002"],
    ] as const) {
      const numberField = document.querySelector<HTMLInputElement>(
        `[name="companyNumbers.${companyId}"]`
      );
      expect(numberField).not.toBeNull();
      // The field fill is synchronous: the change event reaches the form
      // in the same tick, so the act callback has no promise to await.
      act(() => {
        if (numberField) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          setter?.call(numberField, number);
          numberField.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
          );
        }
      });
    }

    const submit = [...document.body.querySelectorAll("button")].find(
      (button) => button.getAttribute("type") === "submit"
    );
    expect(submit).toBeDefined();
    const form = submit?.closest("form");
    expect(form).not.toBeNull();

    // The awaited act flushes the transition and the mocked action's
    // promise without the async callback the linter flags.
    await act(() => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(markInvoiced).toHaveBeenCalledTimes(1);
    const call = markInvoiced.mock.calls[0] as unknown[];
    const values = call[1] as { bookingIds: string[] };
    expect(values.bookingIds).toEqual([
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
    ]);
    // The unticked booking's id must not ride along: the payload carries
    // exactly the ticked set.
    expect(values.bookingIds).not.toContain(
      "00000000-0000-0000-0000-000000000003"
    );
  });

  it("opens the detail sheet for the row that asked for it", () => {
    renderTable([row, nordicRow]);

    openRowMenu("B-2610-0002");
    act(() => {
      menuItem(copy.actions.details).click();
    });

    // The sheet carries the picked booking's identity: its number as the
    // title, its company under it, its room among the details — the other
    // booking's room must not leak in.
    expect(
      document.querySelector('[data-slot="sheet-title"]')?.textContent
    ).toBe("B-2610-0002");
    expect(
      document.querySelector('[data-slot="sheet-description"]')?.textContent
    ).toBe("Nordic Events");
    const sheet = document.querySelector('[data-slot="sheet-content"]');
    expect(sheet?.textContent).toContain("Room of Requirements");
    expect(sheet?.textContent).not.toContain("Room of Ideas");
  });

  it("opens the edit sheet for the row that asked for it", () => {
    renderTable([row, nordicRow]);

    openRowMenu("B-2610-0001");
    act(() => {
      menuItem(copy.editLabel).click();
    });

    // The edit sheet's heading is generic; the booking number under it is
    // the identity, so the wrong booking's number fails the assert.
    expect(
      document.querySelector('[data-slot="sheet-title"]')?.textContent
    ).toBe(copy.editTitle);
    expect(
      document.querySelector('[data-slot="sheet-description"]')?.textContent
    ).toBe("B-2610-0001");
  });

  it("hides the cancel action for a booking that has started", () => {
    // canAdminCancel only allows a confirmed booking that has not begun:
    // the row menu has no cancel item, and the detail sheet's foot has
    // no cancel button either — the guard runs in both places.
    const startedRow: AdminBookingRow = {
      ...row,
      endAt: "2001-01-01T10:00:00Z",
      startAt: "2001-01-01T08:00:00Z",
    };
    renderTable([startedRow]);

    openRowMenu("B-2610-0001");
    expect(document.body.textContent).not.toContain(copy.cancel.action);

    act(() => {
      menuItem(copy.actions.details).click();
    });
    expect(
      document.querySelector('[data-slot="sheet-title"]')?.textContent
    ).toBe("B-2610-0001");
    expect(document.body.textContent).not.toContain(copy.cancel.action);
  });

  it("keeps the cancel action for a future booking and names the booking", () => {
    const futureRow: AdminBookingRow = {
      ...row,
      endAt: "2030-01-01T10:00:00Z",
      startAt: "2030-01-01T08:00:00Z",
    };
    renderTable([futureRow]);

    openRowMenu("B-2610-0001");
    act(() => {
      menuItem(copy.cancel.action).click();
    });

    // The confirm names what is being cancelled: the room and company in
    // the title, the booking number in the summary under it.
    expect(document.body.textContent).toContain(
      copy.cancel.title("Room of Ideas", "Rituals")
    );
    expect(document.body.textContent).toContain("B-2610-0001");
  });
});
