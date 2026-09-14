import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { EmailTemplate } from "@/emails/templates/registry";
import { sendMail } from "./send-mail";

const mocks = vi.hoisted(() => {
  const insertSingle = vi.fn();
  const updateEq = vi.fn();
  const insert = vi.fn(() => ({ select: () => ({ single: insertSingle }) }));
  const update = vi.fn(() => ({ eq: updateEq }));
  return {
    admin: {
      from: vi.fn(() => ({ insert, update })),
      insert,
      insertSingle,
      update,
      updateEq,
    },
    env: {
      APP_ENV: "development" as "development" | "production",
      EMAIL_REDIRECT_TO: "qa@example.com" as string | undefined,
      RESEND_API_KEY: "re_test" as string,
      RESEND_FROM: "The Social House <booking@tsh-dev.jacobfri.is>",
    },
    send: vi.fn(),
  };
});

vi.mock("@/lib/env", () => ({ env: mocks.env }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mocks.admin,
}));

vi.mock("resend", () => {
  class FakeResend {
    emails = { send: mocks.send };
  }
  return { Resend: FakeResend };
});

vi.mock("@/emails/templates/registry", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/emails/templates/registry")>();
  return {
    ...actual,
    emailTemplates: {
      "admin-company-completed": {
        html: "<p>{{{COMPANY_DISPLAY_NAME}}}</p>",
        subject: "{{{COMPANY_DISPLAY_NAME}}} har færdiggjort sin oprettelse",
        variables: z.object({ COMPANY_DISPLAY_NAME: z.string() }),
      } satisfies EmailTemplate,
      "verification-code": {
        html: "<p>{{{CODE}}}</p>",
        subject: "Din bekræftelseskode",
        variables: z.object({ CODE: z.string() }),
      } satisfies EmailTemplate,
    },
  };
});

const sendInput = {
  kind: "verification-code" as const,
  to: "booker@rituals.dk",
  variables: { CODE: "123456" },
};

describe("sendMail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.APP_ENV = "development";
    mocks.env.RESEND_API_KEY = "re_test";
    mocks.env.RESEND_FROM = "The Social House <booking@tsh-dev.jacobfri.is>";
    mocks.env.EMAIL_REDIRECT_TO = "qa@example.com";
    mocks.admin.insertSingle.mockResolvedValue({
      data: { outbound_email_id: "log-1" },
      error: null,
    });
    mocks.admin.updateEq.mockResolvedValue({ data: null, error: null });
    mocks.send.mockResolvedValue({
      data: { id: "resend-1" },
      error: null,
      headers: {},
    });
  });

  it("sends with the fixed sender, bare reply-to, and the kind as template id", async () => {
    await sendMail(sendInput);

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "The Social House <booking@tsh-dev.jacobfri.is>",
        replyTo: "booking@tsh-dev.jacobfri.is",
        subject: "[development] Din bekræftelseskode",
        template: { id: "verification-code", variables: { CODE: "123456" } },
      })
    );
  });

  it("redirects every recipient to EMAIL_REDIRECT_TO in development and logs the real recipient", async () => {
    await sendMail(sendInput);

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["qa@example.com"] })
    );
    expect(mocks.admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ outbound_email_to: "booker@rituals.dk" })
    );
  });

  it("sends to the real recipient in production without the subject prefix", async () => {
    mocks.env.APP_ENV = "production";
    await sendMail(sendInput);

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Din bekræftelseskode",
        to: ["booker@rituals.dk"],
      })
    );
  });

  it("substitutes {{{KEY}}} placeholders in the subject", async () => {
    mocks.env.APP_ENV = "production";
    await sendMail({
      companyId: "company-1",
      kind: "admin-company-completed",
      to: "admin@thesocialhouse.dk",
      variables: { COMPANY_DISPLAY_NAME: "Rituals" },
    });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Rituals har færdiggjort sin oprettelse",
      })
    );
  });

  it("writes the queued row first and stores the Resend id on success", async () => {
    const result = await sendMail(sendInput);

    expect(mocks.admin.insert).toHaveBeenCalledWith({
      outbound_email_booking_id: null,
      outbound_email_company_id: null,
      outbound_email_kind: "verification-code",
      outbound_email_status: "queued",
      outbound_email_to: "booker@rituals.dk",
    });
    expect(result).toEqual({ outboundEmailId: "log-1", resendId: "resend-1" });
    expect(mocks.admin.updateEq).toHaveBeenCalledWith(
      "outbound_email_id",
      "log-1"
    );
  });

  it("marks the row failed with a redacted error and throws when Resend rejects", async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: {
        message: `Invalid recipient: ${sendInput.to}`,
        name: "validation_error",
        statusCode: 422,
      },
    });

    await expect(sendMail(sendInput)).rejects.toThrow("Resend rejected");
    expect(mocks.admin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        outbound_email_error: "Invalid recipient: [recipient]",
        outbound_email_status: "failed",
      })
    );
  });

  it("refuses a second once-only mail for the same booking before calling Resend", async () => {
    mocks.admin.insertSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        details: null,
        hint: null,
        message: "duplicate key value",
      },
    });

    await expect(sendMail(sendInput)).rejects.toThrow("once-only index");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("throws when no template is registered for the kind", async () => {
    await expect(
      sendMail({ ...sendInput, kind: "reminder", variables: {} })
    ).rejects.toThrow('no template registered for "reminder"');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("throws in development when EMAIL_REDIRECT_TO is unset, before Resend is called", async () => {
    mocks.env.EMAIL_REDIRECT_TO = undefined;

    await expect(sendMail(sendInput)).rejects.toThrow("EMAIL_REDIRECT_TO");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("throws a config error when RESEND_API_KEY is unset, before writing the log", async () => {
    mocks.env.RESEND_API_KEY = "";

    await expect(sendMail(sendInput)).rejects.toThrow(
      "RESEND_API_KEY is not set"
    );
    expect(mocks.admin.insert).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("validates variables against the registered schema", async () => {
    await expect(
      sendMail({ ...sendInput, variables: { CODE: 123_456 } })
    ).rejects.toThrow();
  });
});
