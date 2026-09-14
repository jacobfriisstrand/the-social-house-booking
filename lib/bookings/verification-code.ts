// The six-digit code itself (#2): cryptographically random, stored as a
// hash bound to the booking, compared in constant time. The code space is
// only a million values, so the attempt limit in lib/domain/verification.ts
// is the real defence; the hash keeps a leaked table from being readable.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { VERIFICATION_CODE_LENGTH } from "@/lib/domain/verification";

const CODE_SPACE = 10 ** VERIFICATION_CODE_LENGTH;

export const generateVerificationCode = (): string =>
  randomInt(0, CODE_SPACE).toString().padStart(VERIFICATION_CODE_LENGTH, "0");

export const hashVerificationCode = (bookingId: string, code: string): string =>
  createHash("sha256").update(`${bookingId}:${code}`).digest("hex");

export const verificationCodeMatches = (
  bookingId: string,
  code: string,
  storedHash: string
): boolean => {
  const expected = Buffer.from(hashVerificationCode(bookingId, code));
  const stored = Buffer.from(storedHash);
  return expected.length === stored.length && timingSafeEqual(expected, stored);
};
