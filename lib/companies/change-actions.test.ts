import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveCompanyChange } from "./change-actions";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  rpc: vi.fn(),
  sendMail: vi.fn(),
  single: vi.fn(),
  updateUserById: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = {
      eq: () => builder,
      gt: () => builder,
      insert: mocks.insert,
      is: () => builder,
      maybeSingle: mocks.maybeSingle,
      select: () => builder,
      single: mocks.single,
    };
    return {
      auth: { admin: { updateUserById: mocks.updateUserById } },
      from: () => builder,
      rpc: mocks.rpc,
    };
  },
}));

import { verifyNewCompanyEmail } from "./change-actions";

vi.mock("@/lib/email/send-mail", () => ({ sendMail: mocks.sendMail }));

const requestId = "33333333-3333-3333-3333-333333333070";
const currentToken = "current-raw-token";

describe("approveCompanyChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: {
        company_id: "22222222-2222-2222-2222-222222222070",
        current_email: "current@tsh.test",
        next_step: "awaiting_new_email",
        proposed_email: "new@tsh.test",
      },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: {
        company_change_request_company_id:
          "22222222-2222-2222-2222-222222222070",
      },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.sendMail.mockResolvedValue(undefined);
  });

  it("sends the new-email verification and succeeds when the current-email approval passes", async () => {
    const result = await approveCompanyChange(requestId, currentToken);

    expect(result).toEqual({ email: "new@tsh.test", success: true });
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_change_token_kind: "new_email",
        company_change_token_request_id: requestId,
      })
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "company-change-new-email",
        to: "new@tsh.test",
      })
    );
  });

  it("returns success without new-email steps for a non-email change", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        company_id: "22222222-2222-2222-2222-222222222070",
        current_email: "current@tsh.test",
        next_step: "committed",
        proposed_email: "current@tsh.test",
      },
      error: null,
    });

    const result = await approveCompanyChange(requestId, currentToken);

    expect(result).toEqual({ success: true });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("verifies the new email, revokes sessions and redirects to login with an alert", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "commit_company_email_change"
        ? { data: {}, error: null }
        : { data: null, error: null }
    );
    mocks.single
      .mockResolvedValueOnce({
        data: {
          company_change_request_company_id:
            "22222222-2222-2222-2222-222222222070",
          company_change_request_current_email: "current@tsh.test",
          company_change_request_proposed_email: "new@tsh.test",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_auth_user_id: "11111111-1111-1111-1111-111111111070" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_display_name: "Change Test" },
        error: null,
      });
    mocks.updateUserById.mockResolvedValue({ error: null });
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });

    await expect(
      verifyNewCompanyEmail(requestId, "new-email-token")
    ).rejects.toThrow("NEXT_REDIRECT:/login?email-changed=new%40tsh.test");
    expect(mocks.updateUserById).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111070",
      { email: "new@tsh.test", email_confirm: true }
    );
    expect(mocks.rpc).toHaveBeenCalledWith("revoke_company_sessions", {
      p_auth_user_id: "11111111-1111-1111-1111-111111111070",
    });
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });
});
