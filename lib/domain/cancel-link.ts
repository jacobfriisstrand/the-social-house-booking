// The secure cancellation link (#5, Bilag 1 "Afbooking"): carried by Mail 4
// (booking confirmation) and Mail 5 (reminder), resolved by the public
// cancellation page. The link is signed, not stored: an HMAC of the booking
// id with a server secret, so any sender of the confirmation or reminder
// mail can derive the same link and a tampered or forged token fails the
// timing-safe check. The page and the confirm action still check the
// booking's status — a cancelled booking invalidates its link.
import { createHmac, timingSafeEqual } from "node:crypto";

export const signCancellationToken = (
  secret: string,
  bookingId: string
): string => createHmac("sha256", secret).update(bookingId).digest("base64url");

export const cancellationLinkIsValid = (
  secret: string,
  bookingId: string,
  token: string
): boolean => {
  const expected = Buffer.from(signCancellationToken(secret, bookingId));
  const provided = Buffer.from(token);
  return (
    provided.length === expected.length && timingSafeEqual(expected, provided)
  );
};

// The URL Mail 4 and Mail 5 embed. The public page is
// app/(public)/cancel-booking/[bookingId]/page.tsx.
export const cancellationLinkUrl = (
  siteUrl: string,
  bookingId: string,
  secret: string
): string =>
  `${siteUrl}/cancel-booking/${bookingId}?token=${encodeURIComponent(signCancellationToken(secret, bookingId))}`;
