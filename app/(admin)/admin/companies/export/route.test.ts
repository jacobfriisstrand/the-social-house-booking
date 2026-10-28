import { describe, expect, it, vi } from "vitest";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { cphDate } from "@/lib/domain/opening-hours";

// Pins the route's wiring: the admin check (401/403) and the CSV
// attachment of the companies read. The CSV cells are
// admin-export.test.ts's subject; the header line here proves the body is
// that module's output.
const state = vi.hoisted(() => ({
  companies: [] as CompanyRow[],
  session: null as null | { appRole?: string; email: string; userId: string },
}));

vi.mock("@/lib/auth/get-session", () => ({
  getSession: () => state.session,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));
vi.mock("@/lib/companies/admin-data", () => ({
  listAdminCompanies: () => state.companies,
}));
vi.mock("@/lib/export/pdf", () => ({
  renderTablePdf: () => Buffer.from("%PDF-123"),
}));

import { GET, POST } from "./route";

const company = (overrides: Partial<CompanyRow>): CompanyRow =>
  ({
    company_contact_name: "Anna Jensen",
    company_contact_phone: "+45 20 12 34 56",
    company_cvr_number: "12345678",
    company_discount_percent: 15,
    company_display_name: "Ærø ApS",
    company_email: "kontakt@aeroe.dk",
    company_id: "c1",
    company_invoice_email: "faktura@aeroe.dk",
    company_master_data_completed_at: "2026-09-01T10:00:00Z",
    company_membership_status: "member",
    ...overrides,
  }) as CompanyRow;

describe("companies export route", () => {
  it("refuses a visitor with 401", async () => {
    state.session = null;
    expect(
      (await GET(new Request("http://x/admin/companies/export"))).status
    ).toBe(401);
  });

  it("refuses a non-admin session with 403", async () => {
    state.session = { appRole: undefined, email: "x@y.dk", userId: "u" };
    expect(
      (await GET(new Request("http://x/admin/companies/export"))).status
    ).toBe(403);
  });

  it("streams the companies as a CSV attachment", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.companies = [company({})];
    const response = await GET(new Request("http://x/admin/companies/export"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8"
    );
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="virksomheder-${cphDate(new Date())}.csv"`
    );
    // response.text() strips a leading BOM (fetch's UTF-8 decode), so the
    // BOM is pinned on the bytes: the wire carries it, Excel reads æøå.
    const body = new Uint8Array(await response.arrayBuffer());
    expect([...body.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(body.slice(3))).toBe(
      "Visningsnavn;Email;Medlemsstatus;Rabat (%);CVR;Kontaktperson;Mobilnummer;Faktura-email;Stamdata\r\nÆrø ApS;kontakt@aeroe.dk;Medlem;15;12345678;Anna Jensen;'+45 20 12 34 56;faktura@aeroe.dk;Udfyldt\r\n"
    );
  });

  it("streams a PDF when the format asks for it", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.companies = [company({})];
    const response = await GET(
      new Request("http://x/admin/companies/export?format=pdf")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="virksomheder-${cphDate(new Date())}.pdf"`
    );
    expect(await response.text()).toContain("%PDF-123");
  });
});

describe("companies export route (POST)", () => {
  const guid = (n: number): string =>
    `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

  const post = (body: unknown): Promise<Response> =>
    POST(
      new Request("http://x/admin/companies/export", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

  it("refuses a visitor with 401", async () => {
    state.session = null;
    expect((await post({ companyIds: [guid(1)], format: "csv" })).status).toBe(
      401
    );
  });

  it("refuses a non-admin session with 403", async () => {
    state.session = { appRole: undefined, email: "x@y.dk", userId: "u" };
    expect((await post({ companyIds: [guid(1)], format: "csv" })).status).toBe(
      403
    );
  });

  it("rejects a malformed body with 400", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    expect((await post({ companyIds: [], format: "csv" })).status).toBe(400);
    expect((await post({ companyIds: [guid(1)], format: "xlsx" })).status).toBe(
      400
    );
  });

  it("streams exactly the posted companies, in the posted order", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.companies = [
      company({
        company_display_name: "Nordborg Event ApS",
        company_id: guid(2),
      }),
      company({ company_display_name: "Ærø ApS", company_id: guid(1) }),
    ];
    const response = await post({
      companyIds: [guid(1), guid(2)],
      format: "csv",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="virksomheder-${cphDate(new Date())}.csv"`
    );
    const lines = (await response.text()).split("\r\n");
    expect(lines[1].startsWith("Ærø ApS;")).toBe(true);
    expect(lines[2].startsWith("Nordborg Event ApS;")).toBe(true);
  });

  it("drops a posted id the read cannot see, keeps the rest", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.companies = [
      company({
        company_display_name: "Nordborg Event ApS",
        company_id: guid(2),
      }),
    ];
    const lines = (
      await (
        await post({ companyIds: [guid(9), guid(2)], format: "csv" })
      ).text()
    ).split("\r\n");
    expect(lines.length).toBe(3);
    expect(lines[1].startsWith("Nordborg Event ApS;")).toBe(true);
  });

  it("streams a PDF when the format asks for it", async () => {
    state.session = { appRole: "admin", email: "a@b.dk", userId: "u" };
    state.companies = [company({ company_id: guid(1) })];
    const response = await post({ companyIds: [guid(1)], format: "pdf" });
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(await response.text()).toContain("%PDF-123");
  });
});
