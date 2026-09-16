import { describe, expect, it } from "vitest";
import {
  canResendCode,
  holdExpiry,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_MAX_RESENDS,
  VERIFICATION_TTL_MINUTES,
  verificationOutcome,
} from "./verification";

const now = new Date("2026-10-01T10:00:00Z");
const inFiveMinutes = "2026-10-01T10:05:00Z";
const fiveMinutesAgo = "2026-10-01T09:55:00Z";

const live = {
  attempts: 0,
  consumedAt: null,
  expiresAt: inFiveMinutes,
  now,
};

describe("verificationOutcome", () => {
  it("accepts a matching code inside its window", () => {
    expect(verificationOutcome({ ...live, matches: true })).toEqual({
      kind: "accepted",
    });
  });

  it("rejects a wrong code and counts down the remaining attempts", () => {
    expect(verificationOutcome({ ...live, matches: false })).toEqual({
      attemptsLeft: VERIFICATION_MAX_ATTEMPTS - 1,
      kind: "wrong",
    });
  });

  it("locks on the fifth wrong attempt (Bilag 1: max 5 attempts)", () => {
    expect(
      verificationOutcome({
        ...live,
        attempts: VERIFICATION_MAX_ATTEMPTS - 1,
        matches: false,
      })
    ).toEqual({ kind: "locked" });
  });

  it("stays locked once the attempts are used up, even for the right code", () => {
    expect(
      verificationOutcome({
        ...live,
        attempts: VERIFICATION_MAX_ATTEMPTS,
        matches: true,
      })
    ).toEqual({ kind: "locked" });
  });

  it("rejects a code past its expiry, even when it matches", () => {
    expect(
      verificationOutcome({ ...live, expiresAt: fiveMinutesAgo, matches: true })
    ).toEqual({ kind: "expired" });
  });

  it("treats the expiry instant itself as expired", () => {
    expect(
      verificationOutcome({
        ...live,
        expiresAt: now.toISOString(),
        matches: true,
      })
    ).toEqual({ kind: "expired" });
  });

  it("rejects a code that was already consumed (single use)", () => {
    expect(
      verificationOutcome({
        ...live,
        consumedAt: "2026-10-01T09:59:00Z",
        matches: true,
      })
    ).toEqual({ kind: "consumed" });
  });
});

describe("holdExpiry", () => {
  it("is ten minutes after issue (docs/agents/auth.md)", () => {
    expect(VERIFICATION_TTL_MINUTES).toBe(10);
    expect(holdExpiry(now).toISOString()).toBe("2026-10-01T10:10:00.000Z");
  });
});

describe("canResendCode", () => {
  it("allows a resend while fewer than the cap have been issued after the first", () => {
    expect(canResendCode(1)).toBe(true);
    expect(canResendCode(VERIFICATION_MAX_RESENDS)).toBe(true);
  });

  it("refuses once the first code plus every resend has been issued", () => {
    expect(canResendCode(VERIFICATION_MAX_RESENDS + 1)).toBe(false);
  });
});
