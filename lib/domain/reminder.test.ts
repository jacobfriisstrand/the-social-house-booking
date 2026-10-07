import { describe, expect, it } from "vitest";
import { reminderWindow } from "./reminder";

describe("reminderWindow", () => {
  it("covers starts from 23 hours (exclusive) to 24 hours (inclusive) ahead", () => {
    const window = reminderWindow(new Date("2026-10-07T09:00:00+02:00"));
    expect(window.after.toISOString()).toBe("2026-10-08T06:00:00.000Z");
    expect(window.until.toISOString()).toBe("2026-10-08T07:00:00.000Z");
  });

  it("tiles the timeline: consecutive hourly runs share only a boundary", () => {
    const first = reminderWindow(new Date("2026-10-07T09:00:00+02:00"));
    const second = reminderWindow(new Date("2026-10-07T10:00:00+02:00"));
    expect(second.after.getTime()).toBe(first.until.getTime());
  });

  it("counts real hours across the end of summer time", () => {
    // 25 October 2026 has 25 hours in Copenhagen; 24 real hours after
    // Saturday 10:00 CEST is Sunday 09:00 CET.
    const window = reminderWindow(new Date("2026-10-24T10:00:00+02:00"));
    expect(window.until.toISOString()).toBe(
      new Date("2026-10-25T09:00:00+01:00").toISOString()
    );
  });
});
