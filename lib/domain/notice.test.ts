import { describe, expect, it } from "vitest";
import { noticeEndsAt, noticeLastDay, noticeStatus } from "./notice";

describe("noticeEndsAt", () => {
  it("ends at the midnight after the last day, summer time", () => {
    expect(noticeEndsAt("2026-10-24").toISOString()).toBe(
      "2026-10-24T22:00:00.000Z"
    );
  });

  it("ends at the midnight after the last day, on the day summer time ends", () => {
    expect(noticeEndsAt("2026-10-25").toISOString()).toBe(
      "2026-10-25T23:00:00.000Z"
    );
  });
});

describe("noticeLastDay", () => {
  it("reads the stored end back as the last day it shows", () => {
    expect(noticeLastDay(new Date("2026-10-24T22:00:00.000Z"))).toBe(
      "2026-10-24"
    );
    expect(noticeLastDay(noticeEndsAt("2026-10-25"))).toBe("2026-10-25");
  });
});

describe("noticeStatus", () => {
  const now = new Date("2026-10-24T12:00:00Z");

  it("is shown while on without an end", () => {
    expect(noticeStatus({ endsAt: null, isActive: true }, now)).toBe("shown");
  });

  it("is shown while on and the end is ahead", () => {
    expect(
      noticeStatus({ endsAt: noticeEndsAt("2026-10-24"), isActive: true }, now)
    ).toBe("shown");
  });

  it("has ended once the end has passed", () => {
    expect(
      noticeStatus({ endsAt: noticeEndsAt("2026-10-23"), isActive: true }, now)
    ).toBe("ended");
  });

  it("is off when switched off, whatever the end", () => {
    expect(
      noticeStatus({ endsAt: noticeEndsAt("2026-10-30"), isActive: false }, now)
    ).toBe("off");
  });
});
