// The URL state of the admin booking overview (#9): parsing falls back to
// the current month and keeps the filters, the href builder carries only
// what deviates from the defaults, and the calendar's arrows move the whole
// period.
import { describe, expect, it } from "vitest";
import {
  adminViewHref,
  movedPeriod,
  parseAdminViewParams,
} from "./admin-view-params";

const TODAY = "2026-10-02";

const parse = (params: Record<string, string | string[]>) =>
  parseAdminViewParams(params, TODAY);

describe("parseAdminViewParams", () => {
  it("defaults to the current month, the list view, and today's focus", () => {
    expect(parse({})).toEqual({
      companyIds: [],
      focusDate: TODAY,
      fromDate: "2026-10-01",
      includeHouseEvents: true,
      invoicingStatuses: [],
      memberships: [],
      roomIds: [],
      sort: "date",
      sortDir: "asc",
      toDate: "2026-10-31",
      view: "list",
    });
  });

  it("reads every filter from the URL", () => {
    const params = parse({
      company: "c1",
      dir: "desc",
      from: "2026-09-01",
      houseEvents: "hide",
      room: "r1",
      sort: "total",
      status: "invoiced",
      to: "2026-09-30",
      view: "week",
    });
    expect(params.companyIds).toEqual(["c1"]);
    expect(params.roomIds).toEqual(["r1"]);
    expect(params.invoicingStatuses).toEqual(["invoiced"]);
    expect(params.includeHouseEvents).toBe(false);
    expect(params.view).toBe("week");
    expect(params.sort).toBe("total");
    expect(params.sortDir).toBe("desc");
  });

  it("reads a repeated param as several selected ids", () => {
    const params = parse({
      company: ["c1", "c2"],
      membership: ["member", "external"],
      room: ["r1", "r2"],
      status: ["invoiced", "not_invoiced"],
    });
    expect(params.companyIds).toEqual(["c1", "c2"]);
    expect(params.roomIds).toEqual(["r1", "r2"]);
    expect(params.invoicingStatuses).toEqual(["invoiced", "not_invoiced"]);
    expect(params.memberships).toEqual(["member", "external"]);
  });

  it("swaps a reversed period instead of matching nothing forever", () => {
    const params = parse({ from: "2026-09-10", to: "2026-09-01" });
    expect(params.fromDate).toBe("2026-09-01");
    expect(params.toDate).toBe("2026-09-10");
  });

  it("rejects unknown values instead of passing them on", () => {
    const params = parse({
      company: ["", "ghost"],
      dir: "up",
      from: "01/09/2026",
      membership: ["vip", "member"],
      sort: "vibes",
      status: ["maybe", "invoiced"],
      view: "year",
    });
    expect(params.companyIds).toEqual(["ghost"]);
    expect(params.invoicingStatuses).toEqual(["invoiced"]);
    expect(params.memberships).toEqual(["member"]);
    expect(params.view).toBe("list");
    expect(params.sort).toBe("date");
    expect(params.sortDir).toBe("asc");
    // The bad date falls back to the month window.
    expect(params.fromDate).toBe("2026-10-01");
  });

  it("clamps the focus date into the period", () => {
    const params = parse({
      date: "2026-12-24",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(params.focusDate).toBe("2026-09-30");
  });

  it("the month shortcut picks that month's window", () => {
    const params = parse({ month: "2026-01" });
    expect(params.fromDate).toBe("2026-01-01");
    expect(params.toDate).toBe("2026-01-31");
  });
});

describe("adminViewHref", () => {
  it("carries only what deviates from the defaults", () => {
    const base = parse({});
    expect(adminViewHref(base)).toBe(
      `/admin/bookings?from=2026-10-01&to=2026-10-31&view=list&date=${TODAY}`
    );
  });

  it("keeps the filters through a view switch", () => {
    const base = parse({
      company: ["c1", "c2"],
      houseEvents: "hide",
      status: "not_invoiced",
      view: "list",
    });
    const href = adminViewHref(base, { view: "month" });
    expect(href).toContain("company=c1");
    expect(href).toContain("company=c2");
    expect(href).toContain("status=not_invoiced");
    expect(href).toContain("houseEvents=hide");
    expect(href).toContain("view=month");
  });
});

describe("movedPeriod", () => {
  const base = parse({ view: "week" });

  it("moves a week by seven days, focus included", () => {
    const moved = movedPeriod(
      {
        ...base,
        focusDate: "2026-10-02",
        fromDate: "2026-09-28",
        toDate: "2026-10-04",
      },
      1
    );
    expect(moved).toEqual({
      focusDate: "2026-10-09",
      fromDate: "2026-10-05",
      toDate: "2026-10-11",
    });
  });

  it("moves a month across its lengths and the year boundary", () => {
    const month = parse({ view: "month" });
    const forward = movedPeriod(
      {
        ...month,
        focusDate: "2026-10-02",
        fromDate: "2026-10-01",
        toDate: "2026-10-31",
      },
      1
    );
    expect(forward.fromDate).toBe("2026-11-01");
    expect(forward.toDate).toBe("2026-11-30");
    // The focus clamps into the month it lands in.
    expect(forward.focusDate).toBe("2026-11-01");

    const acrossYear = movedPeriod(
      {
        ...month,
        focusDate: "2026-12-15",
        fromDate: "2026-12-01",
        toDate: "2026-12-31",
      },
      1
    );
    expect(acrossYear.fromDate).toBe("2027-01-01");
    expect(acrossYear.toDate).toBe("2027-01-31");
  });

  it("moves a day by one day", () => {
    const day = parse({ view: "day" });
    const moved = movedPeriod(
      {
        ...day,
        focusDate: "2026-10-02",
        fromDate: "2026-10-02",
        toDate: "2026-10-02",
      },
      -1
    );
    expect(moved).toEqual({
      focusDate: "2026-10-01",
      fromDate: "2026-10-01",
      toDate: "2026-10-01",
    });
  });
});
