import { describe, expect, it } from "vitest";
import { cancellationFeeOre, cancellationPercent } from "./cancellation";

describe("cancellationPercent", () => {
  it("returns 0 when more than 72 hours before", () => {
    expect(cancellationPercent(73)).toBe(0);
  });

  it("returns 50 at exactly 72 hours (inclusive boundary)", () => {
    expect(cancellationPercent(72)).toBe(50);
  });

  it("returns 50 at exactly 24 hours (inclusive boundary)", () => {
    expect(cancellationPercent(24)).toBe(50);
  });

  it("returns 50 between 24 and 72 hours", () => {
    expect(cancellationPercent(48)).toBe(50);
  });

  it("returns 100 when less than 24 hours before", () => {
    expect(cancellationPercent(23)).toBe(100);
  });

  it("returns 100 when cancelling immediately before", () => {
    expect(cancellationPercent(0)).toBe(100);
  });
});

describe("cancellationFeeOre", () => {
  it("returns 0 for free cancellation (>72h)", () => {
    // Member price: 1200 kr = 120000 øre, 73 hours before
    expect(cancellationFeeOre(120_000, 73)).toBe(0);
  });

  it("returns 50% of member price at 72h boundary", () => {
    expect(cancellationFeeOre(120_000, 72)).toBe(60_000);
  });

  it("returns 50% of member price at 24h boundary", () => {
    expect(cancellationFeeOre(120_000, 24)).toBe(60_000);
  });

  it("returns 100% of member price below 24h", () => {
    expect(cancellationFeeOre(120_000, 23)).toBe(120_000);
  });

  it("rounds half-up to nearest øre", () => {
    // 1001 øre × 50% = 500.5 → rounds to 501
    expect(cancellationFeeOre(1001, 48)).toBe(501);
  });

  it("computes fee on member price, not list price (ADR-0006)", () => {
    // List: 240000, member after 50% discount: 120000
    // Fee at 48h (50%): 60000 (half of member price, not list price)
    const memberPrice = 120_000;
    expect(cancellationFeeOre(memberPrice, 48)).toBe(60_000);
  });

  it("handles the spec example exactly", () => {
    // Member price 1200 kr = 120000 øre, cancels 48h before → 600 kr = 60000 øre
    expect(cancellationFeeOre(120_000, 48)).toBe(60_000);
  });
});
