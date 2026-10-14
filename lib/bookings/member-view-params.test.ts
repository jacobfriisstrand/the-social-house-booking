// The URL state of the member booking overview: the admin overview's
// room, booking-state, date-range and sort params under the same keys,
// none of the admin tools, and only what deviates from the defaults in
// the href.
import { describe, expect, it } from "vitest";
import { memberViewHref, parseMemberViewParams } from "./member-view-params";

describe("parseMemberViewParams", () => {
  it("defaults to no filter and the date ascending", () => {
    expect(parseMemberViewParams({})).toEqual({
      bookingStates: [],
      invoicingStatuses: [],
      roomIds: [],
      sort: "date",
      sortDir: "asc",
    });
  });

  it("reads the filters and the sort from the URL", () => {
    const params = parseMemberViewParams({
      dir: "desc",
      periodFrom: "2026-10-05",
      periodTo: "2026-10-09",
      room: ["r1", "r2"],
      sort: "booker",
      state: ["upcoming", "cancelled"],
      status: "not_invoiced",
    });
    expect(params).toEqual({
      bookingStates: ["upcoming", "cancelled"],
      invoicingStatuses: ["not_invoiced"],
      periodFrom: "2026-10-05",
      periodTo: "2026-10-09",
      roomIds: ["r1", "r2"],
      sort: "booker",
      sortDir: "desc",
    });
  });

  it("ignores the admin tools and unknown sort columns", () => {
    const params = parseMemberViewParams({
      company: "c1",
      membership: "member",
      sort: "company",
      worklist: "1",
    });
    expect(params).toEqual({
      bookingStates: [],
      invoicingStatuses: [],
      roomIds: [],
      sort: "date",
      sortDir: "asc",
    });
  });
});

describe("memberViewHref", () => {
  it("is the bare page without filters or sort", () => {
    expect(memberViewHref(parseMemberViewParams({}))).toBe("/bookings");
  });

  it("round-trips every filter and the sort", () => {
    const href = memberViewHref({
      bookingStates: ["finished"],
      invoicingStatuses: ["invoiced"],
      periodFrom: "2026-10-05",
      periodTo: "2026-10-09",
      roomIds: ["r1", "r2"],
      sort: "price",
      sortDir: "desc",
    });
    expect(href).toBe(
      "/bookings?room=r1&room=r2&status=invoiced&state=finished&periodFrom=2026-10-05&periodTo=2026-10-09&sort=price&dir=desc"
    );
    // The page receives each repeated key as a list, the rest as lists of
    // one — the parser reads both.
    const search = new URL(href, "http://localhost").searchParams;
    const query = Object.fromEntries(
      [...new Set(search.keys())].map((key) => [key, search.getAll(key)])
    );
    expect(parseMemberViewParams(query)).toEqual({
      bookingStates: ["finished"],
      invoicingStatuses: ["invoiced"],
      periodFrom: "2026-10-05",
      periodTo: "2026-10-09",
      roomIds: ["r1", "r2"],
      sort: "price",
      sortDir: "desc",
    });
  });
});
