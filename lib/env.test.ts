import { describe, expect, it } from "vitest";
import { envSchema } from "./env-schema";

// Pins lib/env-schema.ts: declared-once contract with .env.example, the
// empty-to-undefined flag mechanism, and each variable's shape.

const required = {
  APP_ENV: "development",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  RESEND_FROM: "The Social House <booking@thesocialhouse.dk>",
};

describe("envSchema", () => {
  it('strips unknown keys and turns "" into undefined', () => {
    const parsed = envSchema.parse({
      ...required,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      PATH: "/usr/bin",
      SUPABASE_SECRET_KEY: "secret",
    });
    expect(parsed.SUPABASE_SECRET_KEY).toBe("secret");
    expect(parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
    expect(parsed.RESEND_API_KEY).toBeUndefined();
    expect("PATH" in parsed).toBe(false);
  });

  it("covers every variable in .env.example — exactly 19 today", () => {
    expect(Object.keys(envSchema.shape).length).toBe(19);
  });

  it("accepts exactly the three documented APP_ENV values", () => {
    expect(() => envSchema.parse({ ...required, APP_ENV: "preview" })).toThrow(
      "APP_ENV"
    );
    expect(envSchema.parse({ ...required, APP_ENV: "local" }).APP_ENV).toBe(
      "local"
    );
  });

  it("requires the required variables", () => {
    expect(() =>
      envSchema.parse({ ...required, NEXT_PUBLIC_SITE_URL: undefined })
    ).toThrow("NEXT_PUBLIC_SITE_URL");
  });

  it("checks URL shapes", () => {
    expect(() =>
      envSchema.parse({ ...required, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("checks the Outlook mailbox is an address (Graph builds a URL from it)", () => {
    expect(() =>
      envSchema.parse({ ...required, OUTLOOK_MAILBOX: "not-an-address" })
    ).toThrow("OUTLOOK_MAILBOX");
  });

  it("accepts real values on optional variables", () => {
    const parsed = envSchema.parse({
      ...required,
      NEXT_PUBLIC_SENTRY_DSN: "https://abc@sentry.io/1",
    });
    expect(parsed.NEXT_PUBLIC_SENTRY_DSN).toBe("https://abc@sentry.io/1");
  });
});
