import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveCompanyChange,
  requestCompanyChange,
  verifyNewCompanyEmail,
} from "./change-actions";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  ownCompany: vi.fn(),
  redirect: vi.fn(),
  rpc: vi.fn(),
  sendMail: vi.fn(),
  single: vi.fn(),
  updateUserById: vi.fn(),
}));

const companyId = "22222222-2222-2222-2222-222222222070";
const requestId = "33333333-3333-3333-3333-333333333070";

vi.mock("@/lib/env", () => ({
  env: {
    ADMIN_NOTIFY_EMAIL: "admin@tsh.test",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
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

vi.mock("@/lib/email/send-mail", () => ({ sendMail: mocks.sendMail }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    const builder = {
      eq: () => builder,
      maybeSingle: mocks.ownCompany,
      select: () => builder,
    };
    return {
      auth: { getUser: mocks.getUser },
      from: () => builder,
    };
  },
}));

const currentEmailTokenLink = () => {
  mocks.maybeSingle
    .mockResolvedValueOnce({
      data: { company_change_request_company_id: companyId },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { company_master_data_completed_at: "2026-09-01T10:00:00Z" },
      error: null,
    });
};

describe("approveCompanyChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: {
        company_id: companyId,
        current_email: "current@tsh.test",
        next_step: "awaiting_new_email",
        proposed_email: "new@tsh.test",
      },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { company_display_name: "Change Test" },
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.sendMail.mockResolvedValue(undefined);
  });

  it("sends the new-email verification and succeeds when the current-email approval passes", async () => {
    currentEmailTokenLink();

    const result = await approveCompanyChange(requestId, "current-raw-token");

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
    currentEmailTokenLink();
    mocks.rpc.mockResolvedValue({
      data: {
        company_id: companyId,
        current_email: "current@tsh.test",
        next_step: "committed",
        proposed_email: "current@tsh.test",
      },
      error: null,
    });

    const result = await approveCompanyChange(requestId, "current-raw-token");

    expect(result).toEqual({ success: true });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("notifies the admin when the approval completes the master data for the first time", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { company_change_request_company_id: companyId },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_master_data_completed_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          company_display_name: "Change Test",
          company_id: companyId,
        },
        error: null,
      });
    mocks.rpc.mockResolvedValue({
      data: {
        company_id: companyId,
        current_email: "current@tsh.test",
        next_step: "committed",
        proposed_email: "current@tsh.test",
      },
      error: null,
    });

    const result = await approveCompanyChange(requestId, "current-raw-token");

    expect(result).toEqual({ success: true });
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "admin-company-completed" })
    );
  });

  it("verifies the new email, revokes sessions and redirects to login with an alert", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { company_change_request_company_id: companyId },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_master_data_completed_at: "2026-09-01T10:00:00Z" },
        error: null,
      });
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "commit_company_email_change"
        ? { data: {}, error: null }
        : { data: null, error: null }
    );
    mocks.single
      .mockResolvedValueOnce({
        data: {
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

describe("requestCompanyChange", () => {
  const authUserId = "11111111-1111-1111-1111-111111111070";

  const memberValues = {
    attention: "",
    billingAddress: "Gade 1",
    billingCity: "København",
    billingCountry: "Danmark",
    billingNotes: "",
    billingPostalCode: "1000",
    contactName: "Peter Jensen",
    contactPhone: "12345678",
    cvrNumber: "12345678",
    department: "",
    email: "current@tsh.test",
    invoiceEmail: "invoice@tsh.test",
    legalName: "Rituals ApS",
    reference: "",
  };

  const companyRow = (masterDataCompletedAt: string | null) => ({
    company_attention: null,
    company_billing_address: null,
    company_billing_city: null,
    company_billing_country: null,
    company_billing_interval: "monthly",
    company_billing_notes: null,
    company_billing_postal_code: null,
    company_contact_name: null,
    company_contact_phone: null,
    company_cvr_number: null,
    company_department: null,
    company_display_name: "Change Test",
    company_email: "current@tsh.test",
    company_id: companyId,
    company_invoice_email: null,
    company_legal_name: null,
    company_master_data_completed_at: masterDataCompletedAt,
    company_reference: null,
  });

  const applyResult = (
    nextStep: string,
    proposedEmail = "current@tsh.test"
  ) => ({
    data: {
      company_id: companyId,
      current_email: "current@tsh.test",
      next_step: nextStep,
      proposed_email: proposedEmail,
    },
    error: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: authUserId } } });
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "create_company_change_request"
        ? { data: requestId, error: null }
        : applyResult("committed")
    );
    mocks.insert.mockResolvedValue({ error: null });
    mocks.sendMail.mockResolvedValue(undefined);
    mocks.single.mockResolvedValue({
      data: { company_display_name: "Change Test" },
      error: null,
    });
  });

  it("commits a first fill at once without the review mail", async () => {
    mocks.ownCompany.mockResolvedValue({
      data: companyRow(null),
      error: null,
    });
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { company_change_request_company_id: companyId },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_master_data_completed_at: null },
        error: null,
      })
      .mockResolvedValueOnce({ data: companyRow(null), error: null });

    const result = await requestCompanyChange({ status: "idle" }, memberValues);

    expect(result).toEqual({ status: "saved" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "apply_company_change_request",
      expect.anything()
    );
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "admin-company-completed" })
    );
  });

  it("verifies only the new address when a first fill changes the email", async () => {
    mocks.ownCompany.mockResolvedValue({
      data: companyRow(null),
      error: null,
    });
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "create_company_change_request"
        ? { data: requestId, error: null }
        : applyResult("awaiting_new_email", "new@tsh.test")
    );
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { company_change_request_company_id: companyId },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { company_master_data_completed_at: null },
        error: null,
      });

    const result = await requestCompanyChange(
      { status: "idle" },
      { ...memberValues, email: "new@tsh.test" }
    );

    expect(result).toEqual({
      email: "new@tsh.test",
      status: "awaiting_new_email",
    });
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ company_change_token_kind: "new_email" })
    );
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "company-change-new-email",
        to: "new@tsh.test",
      })
    );
  });

  it("still sends the review mail for a later change", async () => {
    mocks.ownCompany.mockResolvedValue({
      data: companyRow("2026-09-01T10:00:00Z"),
      error: null,
    });

    const result = await requestCompanyChange({ status: "idle" }, memberValues);

    expect(result).toEqual({ status: "success" });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_company_change_request",
      expect.anything()
    );
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "company-change-review",
        to: "current@tsh.test",
      })
    );
  });
});
