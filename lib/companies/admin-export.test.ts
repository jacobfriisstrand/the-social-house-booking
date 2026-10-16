import { describe, expect, it } from "vitest";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { toCsv } from "@/lib/export/csv";
import { companiesTable } from "./admin-export";

// The export mirrors the admin Virksomheder table's columns (the header
// row in company-table.tsx): display name, email, the membership badge's
// label, the discount as a bare number and the master-data badge's label.
const company = (overrides: Partial<CompanyRow>): CompanyRow =>
  ({
    company_discount_percent: 15,
    company_display_name: "Ærø ApS",
    company_email: "kontakt@aeroe.dk",
    company_id: "c1",
    company_master_data_completed_at: "2026-09-01T10:00:00Z",
    company_membership_status: "member",
    ...overrides,
  }) as CompanyRow;

const firstLine = (rows: CompanyRow[]): string =>
  toCsv(companiesTable(rows)).split("\r\n")[1];

describe("companiesTable", () => {
  it("carries the table's headers, in the table's order", () => {
    const header = toCsv(companiesTable([]))
      .split("\r\n")[0]
      .replace("\uFEFF", "");
    expect(header).toBe("Visningsnavn;Email;Medlemsstatus;Rabat (%);Stamdata");
  });

  it("maps a complete member to the table's cells", () => {
    expect(firstLine([company({})])).toBe(
      "Ærø ApS;kontakt@aeroe.dk;Medlem;15;Udfyldt"
    );
  });

  it("maps an external company without master data", () => {
    expect(
      firstLine([
        company({
          company_discount_percent: 0,
          company_master_data_completed_at: null,
          company_membership_status: "external",
        }),
      ])
    ).toBe("Ærø ApS;kontakt@aeroe.dk;Ekstern;0;Mangler");
  });

  it("keeps a formula-shaped display name as text", () => {
    expect(firstLine([company({ company_display_name: "=CMD" })])).toBe(
      "'=CMD;kontakt@aeroe.dk;Medlem;15;Udfyldt"
    );
  });
});
