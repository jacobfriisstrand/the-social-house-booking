// The date-range picker's draft transition: the react-day-picker quirks
// (a single click arrives as a one-day range, a finished selection
// extends instead of restarting) pinned so a refactor cannot reintroduce
// the close-on-first-click behaviour.
import { describe, expect, it } from "vitest";
import { nextPeriodDraft } from "./period-range";

describe("nextPeriodDraft", () => {
  it("reads a fresh click as a single-day draft (rdp sends to === from)", () => {
    const result = nextPeriodDraft(
      { from: "2026-10-01", to: "2026-10-01" },
      null
    );
    expect(result).toEqual({ complete: false, draft: { from: "2026-10-01" } });
  });

  it("keeps the picker open on a second click of the same day", () => {
    const prior = { from: "2026-10-01" };
    const result = nextPeriodDraft(
      { from: "2026-10-01", to: "2026-10-01" },
      prior
    );
    expect(result).toEqual({ complete: false, draft: { from: "2026-10-01" } });
  });

  it("completes the range on a second click on another day", () => {
    const prior = { from: "2026-10-01" };
    const result = nextPeriodDraft(
      { from: "2026-10-01", to: "2026-10-04" },
      prior
    );
    expect(result).toEqual({
      complete: true,
      draft: { from: "2026-10-01", to: "2026-10-04" },
    });
  });

  it("restarts on a click into a finished selection, at the moved end", () => {
    const prior = { from: "2026-10-01", to: "2026-10-09" };
    // rdp extends: the from stays, the to is the day the user clicked.
    const result = nextPeriodDraft(
      { from: "2026-10-01", to: "2026-10-15" },
      prior
    );
    expect(result).toEqual({ complete: false, draft: { from: "2026-10-15" } });
  });

  it("restarts at the clicked from when rdp moves that end instead", () => {
    const prior = { from: "2026-10-01", to: "2026-10-09" };
    const result = nextPeriodDraft(
      { from: "2026-10-15", to: "2026-10-20" },
      prior
    );
    expect(result).toEqual({ complete: false, draft: { from: "2026-10-15" } });
  });

  it("empties the draft when the calendar clears its selection", () => {
    const prior = { from: "2026-10-01", to: "2026-10-04" };
    expect(nextPeriodDraft(null, prior)).toEqual({
      complete: false,
      draft: null,
    });
  });
});
