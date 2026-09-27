import { describe, expect, it } from "vitest";

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

import {
  cancellationLinkIsValid,
  cancellationLinkUrl,
  signCancellationToken,
} from "./cancel-link";

describe("signCancellationToken", () => {
  it("signs deterministically and URL-safely", () => {
    const token = signCancellationToken(
      "secret",
      "11111111-1111-1111-1111-111111111111"
    );
    expect(token).toBe(
      signCancellationToken("secret", "11111111-1111-1111-1111-111111111111")
    );
    expect(URL_SAFE.test(token)).toBe(true);
  });

  it("binds the token to the booking id and the secret", () => {
    const bookingId = "11111111-1111-1111-1111-111111111111";
    expect(signCancellationToken("s1", bookingId)).not.toBe(
      signCancellationToken("s2", bookingId)
    );
    expect(
      signCancellationToken("s1", "22222222-2222-2222-2222-222222222222")
    ).not.toBe(signCancellationToken("s1", bookingId));
  });
});

describe("cancellationLinkIsValid", () => {
  const bookingId = "11111111-1111-1111-1111-111111111111";

  it("accepts the signed token", () => {
    expect(
      cancellationLinkIsValid(
        "s1",
        bookingId,
        signCancellationToken("s1", bookingId)
      )
    ).toBe(true);
  });

  it("rejects a token signed with another secret", () => {
    expect(
      cancellationLinkIsValid(
        "s1",
        bookingId,
        signCancellationToken("s2", bookingId)
      )
    ).toBe(false);
  });

  it("rejects a token for another booking", () => {
    expect(
      cancellationLinkIsValid(
        "s1",
        "22222222-2222-2222-2222-222222222222",
        signCancellationToken("s1", bookingId)
      )
    ).toBe(false);
  });

  it("rejects tampered, truncated, and empty tokens", () => {
    const token = signCancellationToken("s1", bookingId);
    expect(cancellationLinkIsValid("s1", bookingId, `${token}x`)).toBe(false);
    expect(cancellationLinkIsValid("s1", bookingId, token.slice(1))).toBe(
      false
    );
    expect(cancellationLinkIsValid("s1", bookingId, "")).toBe(false);
  });
});

describe("cancellationLinkUrl", () => {
  it("builds the public page URL with the token", () => {
    const bookingId = "11111111-1111-1111-1111-111111111111";
    expect(cancellationLinkUrl("https://tsh.test", bookingId, "s1")).toBe(
      `https://tsh.test/cancel-booking/${bookingId}?token=${encodeURIComponent(signCancellationToken("s1", bookingId))}`
    );
  });
});
