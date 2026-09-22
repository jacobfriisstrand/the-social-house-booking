import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/messages/da";
import { setPassword } from "./actions";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      updateUser: mocks.updateUser,
      verifyOtp: mocks.verifyOtp,
    },
  }),
}));

const values = {
  code: "burnt-code",
  password: "nytpassword",
  passwordConfirm: "nytpassword",
  type: "recovery" as const,
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

    await setPassword({ status: "idle" }, values);

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "nytpassword" });
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("reports a dead recovery link only when no session is alive", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "expired" },
    });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const result = await setPassword({ status: "idle" }, values);

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

    const result = await setPassword({ status: "idle" }, values);

    expect(result).toEqual({
      error: messages.setPassword.errors.samePassword,
      status: "error",
    });
  });
});
