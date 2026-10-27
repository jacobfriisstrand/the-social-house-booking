// resendInvitation's two open states: an unused link gets a fresh invite;
// a used link (confirmed email, Auth refuses a second invite) gets Mail 1
// with a minted recovery token, which verifies on the same /set-password
// page.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/messages/da";
import { type ResendInvitationState, resendInvitation } from "./admin-actions";

const companyId = "11111111-1111-1111-1111-111111111070";
const TOKEN_HASH = "hashed-token";

const errorOf = (state: ResendInvitationState): string => {
  if (state.status !== "error") {
    throw new Error("expected an error state");
  }
  return state.error;
};

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  inviteUserByEmail: vi.fn(),
  maybeSingle: vi.fn(),
  requireAdmin: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/email/send-mail", () => ({
  sendMail: mocks.sendMail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        generateLink: mocks.generateLink,
        inviteUserByEmail: mocks.inviteUserByEmail,
      },
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    const builder = {
      eq: () => builder,
      maybeSingle: mocks.maybeSingle,
      select: () => builder,
    };
    return { from: () => builder };
  },
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
}));

describe("resendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: {
        company_display_name: "Rituals ApS",
        company_email: "company@tsh.test",
      },
      error: null,
    });
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: TOKEN_HASH },
        user: { id: "user" },
      },
      error: null,
    });
  });

  it("sends a fresh invite while the link is unused", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({ data: {}, error: null });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(result).toEqual({ status: "success" });
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith("company@tsh.test");
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("sends Mail 1 with a recovery token once the link is used", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "email_exists" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(result).toEqual({ status: "success" });
    expect(mocks.generateLink).toHaveBeenCalledWith({
      email: "company@tsh.test",
      type: "recovery",
    });
    expect(mocks.sendMail).toHaveBeenCalledWith({
      companyId,
      kind: "company-invitation",
      to: "company@tsh.test",
      variables: {
        ACTION_URL:
          "http://localhost:3000/set-password?token_hash=hashed-token&type=recovery",
        COMPANY_DISPLAY_NAME: "Rituals ApS",
      },
    });
  });

  it("fails when the recovery link cannot be minted", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "email_exists" },
    });
    mocks.generateLink.mockResolvedValue({
      data: { properties: null, user: null },
      error: { message: "rate limited" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.resendFailed);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("fails when the invitation mail cannot be sent", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "email_exists" },
    });
    mocks.sendMail.mockRejectedValue(new Error("Resend unavailable"));

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.resendFailed);
  });

  it("fails on other Auth errors without a link fallback", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "unexpected" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.resendFailed);
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  it("fails for a company that does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.notFound);
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });
});
