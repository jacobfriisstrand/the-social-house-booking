import { describe, expect, it } from "vitest";
import {
  acceptInvitationSchema,
  setPasswordLinkSchema,
  setPasswordSchema,
} from "./auth";

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

  it("accepts the magiclink token a resent invitation carries", () => {
    expect(
      setPasswordLinkSchema.safeParse({
        tokenHash: "hashed-token",
        type: "magiclink",
      }).success
    ).toBe(true);
  });
});

describe("setPasswordSchema", () => {
  const values = {
    password: "adgangskode",
    passwordConfirm: "adgangskode",
    tokenHash: "hashed-token",
    type: "recovery" as const,
  };

  it("accepts the recovery password form", () => {
    expect(setPasswordSchema.safeParse(values).success).toBe(true);
  });

  it("rejects the invite type, which has its own form and action", () => {
    expect(
      setPasswordSchema.safeParse({ ...values, type: "invite" }).success
    ).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    expect(
      setPasswordSchema.safeParse({ ...values, passwordConfirm: "andet" })
        .success
    ).toBe(false);
  });
});

describe("acceptInvitationSchema", () => {
  const values = {
    attention: "",
    billingAddress: "Vesterbrogade 1",
    billingCity: "København V",
    billingCountry: "Danmark",
    billingNotes: "",
    billingPostalCode: "1620",
    contactName: "Anna Jensen",
    contactPhone: "20123456",
    cvrNumber: "12345678",
    department: "",
    invoiceEmail: "faktura@rituals.dk",
    legalName: "Rituals ApS",
    password: "adgangskode",
    passwordConfirm: "adgangskode",
    privacyAccepted: true,
    reference: "",
    termsAccepted: true,
    tokenHash: "hashed-token",
    tokenType: "invite" as const,
  };

  it("accepts the password together with the master data", () => {
    expect(acceptInvitationSchema.safeParse(values).success).toBe(true);
  });

  it("rejects an unticked terms checkbox", () => {
    expect(
      acceptInvitationSchema.safeParse({ ...values, termsAccepted: false })
        .success
    ).toBe(false);
  });

  it("rejects an unticked privacy checkbox", () => {
    expect(
      acceptInvitationSchema.safeParse({ ...values, privacyAccepted: false })
        .success
    ).toBe(false);
  });

  it("rejects a token type the invitation form does not serve", () => {
    expect(
      acceptInvitationSchema.safeParse({
        ...values,
        tokenType: "recovery" as const,
      }).success
    ).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    expect(
      acceptInvitationSchema.safeParse({ ...values, passwordConfirm: "andet" })
        .success
    ).toBe(false);
  });

  it("requires every mandatory master data field", () => {
    const { legalName: _legalName, ...incomplete } = values;
    expect(acceptInvitationSchema.safeParse(incomplete).success).toBe(false);
  });
});
