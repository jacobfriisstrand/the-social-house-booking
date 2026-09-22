import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestPasswordReset } from "./recovery-actions";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}));

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("delegates recipient matching to Auth and returns the generic success state", async () => {
    const result = await requestPasswordReset(
      { status: "idle" },
      { email: "kontakt@rituals.dk" }
    );

    expect(result).toEqual({ status: "success" });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "kontakt@rituals.dk",
      { redirectTo: "http://localhost:3000/set-password" }
    );
  });
});
