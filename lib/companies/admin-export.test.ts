import { describe, expect, it } from "vitest";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { toCsv } from "@/lib/export/csv";
import { companiesTable } from "./admin-export";

// The export renders the admin Virksomheder table's one column
// definition (COMPANY_COLUMNS in lib/companies/admin-columns.ts, the
// list the table's header row renders from too): the header line pins
// that list's order, the cell lines pin each column's value — the
// badges' labels, the discount as a bare number, the table's em dash
// where a cell has no value. The phone carries the +45 prefix, so the
// pinned cells show the CSV's formula guard (the ' text prefix) on the
// one real-world value that trips it.
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

const firstLine = (rows: CompanyRow[]): string =>
  toCsv(companiesTable(rows)).split("\r\n")[1];

describe("companiesTable", () => {
  it("carries the table's headers, in the table's order", () => {
    const header = toCsv(companiesTable([]))
      .split("\r\n")[0]
      .replace("\uFEFF", "");
    expect(header).toBe(
      "Visningsnavn;Email;Medlemsstatus;Rabat (%);CVR;Kontaktperson;Mobilnummer;Faktura-email;Stamdata"
    );
  });

  it("maps a complete member to the table's cells", () => {
    expect(firstLine([company({})])).toBe(
      "Ærø ApS;kontakt@aeroe.dk;Medlem;15;12345678;Anna Jensen;'+45 20 12 34 56;faktura@aeroe.dk;Udfyldt"
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
    ).toBe(
      "Ærø ApS;kontakt@aeroe.dk;Ekstern;0;12345678;Anna Jensen;'+45 20 12 34 56;faktura@aeroe.dk;Mangler"
    );
  });

  it("shows the table's em dash where a cell has no value", () => {
    expect(
      firstLine([
        company({
          company_contact_name: null,
          company_contact_phone: null,
          company_cvr_number: null,
          company_invoice_email: null,
        }),
      ])
    ).toBe("Ærø ApS;kontakt@aeroe.dk;Medlem;15;—;—;—;—;Udfyldt");
  });

  it("keeps a formula-shaped display name as text", () => {
    expect(firstLine([company({ company_display_name: "=CMD" })])).toBe(
      "'=CMD;kontakt@aeroe.dk;Medlem;15;12345678;Anna Jensen;'+45 20 12 34 56;faktura@aeroe.dk;Udfyldt"
    );
  });
});
