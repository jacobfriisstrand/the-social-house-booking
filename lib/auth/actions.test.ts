import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { acceptInvitation, setPassword } from "./actions";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  requestCompanyChange: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/companies/change-actions", () => ({
  requestCompanyChange: mocks.requestCompanyChange,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      updateUser: mocks.updateUser,
      verifyOtp: mocks.verifyOtp,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}));

const recoveryValues = {
  code: "burnt-code",
  password: "nytpassword",
  passwordConfirm: "nytpassword",
  type: "recovery" as const,
};

// What the invitation form sends: the password, the two ticked consents,
// the token type the link carried, and the company's master data. The form
// carries no email; the action injects the invited address.
const inviteValues = {
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
  password: "nytpassword",
  passwordConfirm: "nytpassword",
  privacyAccepted: true,
  reference: "",
  termsAccepted: true,
  tokenHash: "hashed-token",
  tokenType: "invite" as const,
};

// The companies row acceptInvitation reads before the data step.
const incompleteCompany = () => {
  mocks.maybeSingle.mockResolvedValue({
    data: {
      company_email: "kontakt@rituals.dk",
      company_master_data_completed_at: null,
    },
    error: null,
  });
};

describe("setPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries on the live recovery session when the code was already used", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid grant" },
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });

    await setPassword({ status: "idle" }, recoveryValues);

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "nytpassword" });
    expect(mocks.redirect).toHaveBeenCalledWith("/login?password-changed=1");
  });

  it("reports a dead recovery link only when no session is alive", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "expired" },
    });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const result = await setPassword({ status: "idle" }, recoveryValues);

    expect(result).toEqual({
      error: messages.setPassword.errors.recoveryLinkInvalid,
      linkInvalid: true,
      status: "error",
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("asks for a different password instead of blaming the link", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: { code: "same_password" } });

    const result = await setPassword({ status: "idle" }, recoveryValues);

    expect(result).toEqual({
      error: messages.setPassword.errors.samePassword,
      status: "error",
    });
  });
});

describe("acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the password, saves the master data and lands logged in", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });
    incompleteCompany();
    mocks.requestCompanyChange.mockResolvedValue({ status: "saved" });

    await acceptInvitation({ status: "idle" }, inviteValues);

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hashed-token",
      type: "invite",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: "nytpassword",
    });
    const [state, values] = mocks.requestCompanyChange.mock.calls[0];
    expect(state).toEqual(idleFormState);
    const {
      password,
      passwordConfirm,
      tokenHash,
      tokenType: _tokenType,
      ...data
    } = inviteValues;
    expect(values).toEqual({ ...data, email: "kontakt@rituals.dk" });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/?signed-up=1");
  });

  it("verifies a resent invitation's magiclink token", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });
    incompleteCompany();
    mocks.requestCompanyChange.mockResolvedValue({ status: "saved" });

    await acceptInvitation(
      { status: "idle" },
      {
        ...inviteValues,
        tokenType: "magiclink",
      }
    );

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hashed-token",
      type: "magiclink",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/?signed-up=1");
  });

  it("retries on the live session when the token was already used", async () => {
    mocks.verifyOtp.mockResolvedValue({
      error: { message: "invalid grant" },
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    // The first submit already set the password; Auth rejects a repeat.
    mocks.updateUser.mockResolvedValue({ error: { code: "same_password" } });
    incompleteCompany();
    mocks.requestCompanyChange.mockResolvedValue({ status: "saved" });

    await acceptInvitation({ status: "idle" }, inviteValues);

    expect(mocks.requestCompanyChange).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/?signed-up=1");
  });

  it("blames the dead link when no session is alive", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const result = await acceptInvitation({ status: "idle" }, inviteValues);

    expect(result).toEqual({
      error: messages.setPassword.errors.linkInvalid,
      linkInvalid: true,
      status: "error",
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.requestCompanyChange).not.toHaveBeenCalled();
  });

  it("keeps the form open when the data save fails", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });
    incompleteCompany();
    const failure = {
      error: messages.companyFields.errors.required,
      status: "error",
    };
    mocks.requestCompanyChange.mockResolvedValue(failure);

    const result = await acceptInvitation({ status: "idle" }, inviteValues);

    expect(result).toEqual(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("skips the data step when the master data is already complete", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        company_email: "kontakt@rituals.dk",
        company_master_data_completed_at: "2026-10-01T10:00:00Z",
      },
      error: null,
    });

    await acceptInvitation({ status: "idle" }, inviteValues);

    expect(mocks.requestCompanyChange).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/?signed-up=1");
  });

  it("reports a missing company row", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await acceptInvitation({ status: "idle" }, inviteValues);

    expect(result).toEqual({
      error: messages.companies.errors.notFound,
      status: "error",
    });
    expect(mocks.requestCompanyChange).not.toHaveBeenCalled();
  });
});
