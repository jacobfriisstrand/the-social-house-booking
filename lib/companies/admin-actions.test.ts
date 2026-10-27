// resendInvitation's two open states: an unused link gets a fresh invite,
// a used link (confirmed email, Auth refuses a second invite) gets the
// password-reset mail, which drives the same /set-password flow.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/messages/da";
import { type ResendInvitationState, resendInvitation } from "./admin-actions";

const companyId = "11111111-1111-1111-1111-111111111070";

const errorOf = (state: ResendInvitationState): string => {
  if (state.status !== "error") {
    throw new Error("expected an error state");
  }
  return state.error;
};

const mocks = vi.hoisted(() => ({
  inviteUserByEmail: vi.fn(),
  maybeSingle: vi.fn(),
  requireAdmin: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { inviteUserByEmail: mocks.inviteUserByEmail } },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    const builder = {
      eq: () => builder,
      maybeSingle: mocks.maybeSingle,
      select: () => builder,
    };
    return {
      auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
      from: () => builder,
    };
  },
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
}));

describe("resendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: { company_email: "company@tsh.test" },
      error: null,
    });
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("sends a fresh invite while the link is unused", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({ data: {}, error: null });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(result).toEqual({ status: "success" });
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith("company@tsh.test");
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("sends the password-reset mail once the link is used", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "email_exists" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(result).toEqual({ status: "success" });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "company@tsh.test",
      { redirectTo: "http://localhost:3000/set-password" }
    );
  });

  it("fails when the password-reset mail cannot be sent", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "email_exists" },
    });
    mocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: "rate limited" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.resendFailed);
    expect(result.status).toBe("error");
  });

  it("fails on other Auth errors without a reset fallback", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { code: "unexpected" },
    });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.resendFailed);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("fails for a company that does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await resendInvitation(companyId, { status: "idle" });

    expect(errorOf(result)).toBe(messages.companies.errors.notFound);
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });
});
