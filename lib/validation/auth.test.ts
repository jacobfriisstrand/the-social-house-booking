import { describe, expect, it } from "vitest";
import { setPasswordLinkSchema } from "./auth";

describe("setPasswordLinkSchema", () => {
  it("accepts the local PKCE recovery code callback", () => {
    expect(
      setPasswordLinkSchema.safeParse({
        code: "pkce-code",
        type: "recovery",
      }).success
    ).toBe(true);
  });

  it("accepts the Send Email Hook token-hash link", () => {
    expect(
      setPasswordLinkSchema.safeParse({
        tokenHash: "hashed-token",
        type: "recovery",
      }).success
    ).toBe(true);
  });
});
