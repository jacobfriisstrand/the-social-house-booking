import { describe, expect, it } from "vitest";
import {
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
} from "./verification-code";

const bookingId = "66666666-6666-6666-6666-666666666001";
const SIX_DIGITS = /^\d{6}$/;

describe("generateVerificationCode", () => {
  it("is always six digits, leading zeros kept", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateVerificationCode()).toMatch(SIX_DIGITS);
    }
  });
});

describe("verificationCodeMatches", () => {
  it("accepts the code the hash was made from", () => {
    const hash = hashVerificationCode(bookingId, "042719");
    expect(verificationCodeMatches(bookingId, "042719", hash)).toBe(true);
  });

  it("rejects another code", () => {
    const hash = hashVerificationCode(bookingId, "042719");
    expect(verificationCodeMatches(bookingId, "042718", hash)).toBe(false);
  });

  it("binds the hash to the booking, so a code cannot be replayed elsewhere", () => {
    const hash = hashVerificationCode(bookingId, "042719");
    const otherBooking = "66666666-6666-6666-6666-666666666002";
    expect(verificationCodeMatches(otherBooking, "042719", hash)).toBe(false);
  });

  it("does not throw on a malformed stored hash", () => {
    expect(verificationCodeMatches(bookingId, "042719", "not-a-hash")).toBe(
      false
    );
  });
});
