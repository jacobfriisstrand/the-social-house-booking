import { describe, expect, it } from "vitest";
import { bookingLinkUrl, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a path on this site with its query", () => {
    expect(safeNextPath("/bookings?booking=abc")).toBe("/bookings?booking=abc");
  });

  it.each([
    ["an absolute URL", "https://evil.example/bookings"],
    ["a protocol-relative URL", "//evil.example/bookings"],
    ["a backslash host", "/\\evil.example"],
    ["a tab-split host", "/\t/evil.example"],
    ["a relative path", "bookings"],
    ["a javascript URL", "javascript:alert(1)"],
    ["an empty value", ""],
    ["no value", undefined],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe("bookingLinkUrl", () => {
  it("goes through login to the booking on Bookinger", () => {
    const url = new URL(bookingLinkUrl("https://tsh.test", "abc-123"));
    expect(url.origin).toBe("https://tsh.test");
    expect(url.pathname).toBe("/login");
    expect(safeNextPath(url.searchParams.get("next"))).toBe(
      "/bookings?booking=abc-123"
    );
  });
});
