// Booker verification rules (#2, ADR-0004): the code's time window, the
// attempt limit, the resend cap, and how one code entry is judged. Pure;
// lib/bookings/ applies the outcome to the booking and the code row.

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_TTL_MINUTES = 10;
export const VERIFICATION_MAX_ATTEMPTS = 5;
// "Send ny kode" presses allowed after the first code.
export const VERIFICATION_MAX_RESENDS = 3;

const MS_PER_MINUTE = 60_000;

export type VerificationOutcome =
  | { kind: "accepted" }
  | { attemptsLeft: number; kind: "wrong" }
  // Attempts used up: the hold is released.
  | { kind: "locked" }
  | { kind: "expired" }
  | { kind: "consumed" };

export interface VerificationInput {
  attempts: number;
  consumedAt: string | null;
  expiresAt: string;
  matches: boolean;
  now: Date;
}

// Order matters: a consumed or expired code is dead whatever was typed, and
// a locked code stays locked even for the right digits, so the attempt
// limit cannot be probed past.
export function verificationOutcome({
  attempts,
  consumedAt,
  expiresAt,
  matches,
  now,
}: VerificationInput): VerificationOutcome {
  if (consumedAt !== null) {
    return { kind: "consumed" };
  }
  if (new Date(expiresAt).getTime() <= now.getTime()) {
    return { kind: "expired" };
  }
  if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
    return { kind: "locked" };
  }
  if (matches) {
    return { kind: "accepted" };
  }
  const attemptsLeft = VERIFICATION_MAX_ATTEMPTS - attempts - 1;
  if (attemptsLeft <= 0) {
    return { kind: "locked" };
  }
  return { attemptsLeft, kind: "wrong" };
}

// The code and the room hold share one window; a resend moves both.
export function holdExpiry(now: Date): Date {
  return new Date(now.getTime() + VERIFICATION_TTL_MINUTES * MS_PER_MINUTE);
}

// issuedCount is every code issued for the booking so far, the first one
// included.
export function canResendCode(issuedCount: number): boolean {
  return issuedCount <= VERIFICATION_MAX_RESENDS;
}
