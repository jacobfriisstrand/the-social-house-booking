import { describe, expect, it, vi } from "vitest";
import { pickSignedInIdentity } from "./identity";

// The loader shares the module with the pure picker; the mock keeps the
// Supabase client (and lib/env) from evaluating in the node test run.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const COMPANY_ROW = {
  company_display_name: "Rituals",
  company_email: "kontakt@rituals.dk",
};

describe("pickSignedInIdentity", () => {
  it("shows the company's shared account: display name and company email", () => {
    expect(
      pickSignedInIdentity({
        company: COMPANY_ROW,
        isAdmin: false,
        sessionEmail: "kontakt@rituals.dk",
      })
    ).toEqual({
      displayName: "Rituals",
      email: "kontakt@rituals.dk",
    });
  });

  it("falls back to the login email when a company has no row yet", () => {
    expect(
      pickSignedInIdentity({
        company: null,
        isAdmin: false,
        sessionEmail: "kontakt@rituals.dk",
      })
    ).toEqual({
      displayName: "kontakt@rituals.dk",
      email: "kontakt@rituals.dk",
    });
  });

  it("shows the admin registry's display name with the login email", () => {
    expect(
      pickSignedInIdentity({
        adminDisplayName: "Jacob Friis Strand",
        isAdmin: true,
        sessionEmail: "jacob@thesocialhouse.dk",
      })
    ).toEqual({
      displayName: "Jacob Friis Strand",
      email: "jacob@thesocialhouse.dk",
    });
  });

  it("falls back to the login email when the admin has no registry row", () => {
    expect(
      pickSignedInIdentity({
        adminDisplayName: null,
        isAdmin: true,
        sessionEmail: "jacob@thesocialhouse.dk",
      })
    ).toEqual({
      displayName: "jacob@thesocialhouse.dk",
      email: "jacob@thesocialhouse.dk",
    });
  });
});
