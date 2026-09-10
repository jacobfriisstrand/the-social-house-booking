import { describe, expect, it } from "vitest";
import {
  adminValuesToUpdate,
  type CompanyRow,
  companyCompletedVariables,
  companyToAdminValues,
  companyToMasterDataValues,
  hasAllMasterData,
  masterDataToUpdate,
} from "./company-master-data";

const complete = {
  attention: "",
  billingAddress: "Strøget 1",
  billingCity: "København K",
  billingCountry: "Danmark",
  billingNotes: "",
  billingPostalCode: "1160",
  contactName: "Peter Pedersen",
  contactPhone: "+45 2010 2030",
  cvrNumber: "12345678",
  department: "",
  invoiceEmail: "faktura@rituals.dk",
  legalName: "Rituals ApS",
  reference: "",
};

const row: CompanyRow = {
  company_attention: null,
  company_auth_user_id: "00000000-0000-0000-0000-000000000002",
  company_billing_address: null,
  company_billing_city: null,
  company_billing_country: null,
  company_billing_interval: "monthly",
  company_billing_notes: null,
  company_billing_postal_code: null,
  company_contact_name: null,
  company_contact_phone: null,
  company_created_at: "2026-09-10T10:00:00Z",
  company_cvr_number: null,
  company_department: null,
  company_discount_percent: 50,
  company_display_name: "Rituals",
  company_economic_customer_number: null,
  company_email: "kontakt@rituals.dk",
  company_id: "00000000-0000-0000-0000-0000000000b2",
  company_internal_note: null,
  company_invoice_email: null,
  company_legal_name: "Rituals ApS",
  company_master_data_completed_at: null,
  company_membership_status: "member",
  company_reference: null,
  company_updated_at: "2026-09-10T10:00:00Z",
};

const withPatch = (patch: Partial<typeof complete>) => ({
  ...complete,
  ...patch,
});

describe("hasAllMasterData", () => {
  it("is true when all nine mandatory fields are present", () => {
    expect(hasAllMasterData(complete)).toBe(true);
  });

  it("ignores the optional fields", () => {
    expect(hasAllMasterData(withPatch({ attention: "", reference: "" }))).toBe(
      true
    );
  });

  it("is false when a mandatory field is blank or whitespace", () => {
    expect(hasAllMasterData(withPatch({ contactPhone: "" }))).toBe(false);
    expect(hasAllMasterData(withPatch({ cvrNumber: "   " }))).toBe(false);
  });
});

describe("masterDataToUpdate", () => {
  it("stores blank optional fields as null and keeps the mandatory ones", () => {
    const update = masterDataToUpdate(complete);
    expect(update.company_attention).toBeNull();
    expect(update.company_billing_notes).toBeNull();
    expect(update.company_contact_phone).toBe("+45 2010 2030");
    expect(update.company_invoice_email).toBe("faktura@rituals.dk");
  });
});

describe("companyToMasterDataValues", () => {
  it("maps null to empty strings and defaults the country", () => {
    const values = companyToMasterDataValues(row);
    expect(values.contactPhone).toBe("");
    expect(values.legalName).toBe("Rituals ApS");
    expect(values.billingCountry).toBe("Danmark");
  });

  it("keeps a stored country", () => {
    expect(
      companyToMasterDataValues({ ...row, company_billing_country: "Sverige" })
        .billingCountry
    ).toBe("Sverige");
  });
});

describe("admin values round trip", () => {
  it("maps the row to form values and back without inventing data", () => {
    const values = companyToAdminValues(row);
    expect(values.billingCountry).toBe("");
    expect(values.companyId).toBe(row.company_id);
    expect(values.membershipStatus).toBe("member");

    const update = adminValuesToUpdate(values);
    expect(update.company_billing_country).toBeNull();
    expect(update.company_discount_percent).toBe(50);
    expect(update.company_email).toBe("kontakt@rituals.dk");
    expect(update.company_internal_note).toBeNull();
  });
});

describe("companyCompletedVariables", () => {
  const completed: CompanyRow = {
    ...row,
    company_billing_notes: "EAN 5790000000000",
    company_contact_name: "Peter <Pedersen> & co",
    company_contact_phone: "+45 2010 2030",
    company_cvr_number: "12345678",
    company_invoice_email: "faktura@rituals.dk",
  };

  it("fills every Mail 10 placeholder, escaped for HTML", () => {
    const variables = companyCompletedVariables(
      completed,
      "https://example.test/admin/companies/b2?x=1&y=2"
    );
    expect(variables).toEqual({
      ACTION_URL: "https://example.test/admin/companies/b2?x=1&amp;y=2",
      COMPANY_BILLING_METHOD: "Månedlig fakturering",
      COMPANY_CONTACT_NAME: "Peter &lt;Pedersen&gt; &amp; co",
      COMPANY_CONTACT_PHONE: "+45 2010 2030",
      COMPANY_CVR_NUMBER: "12345678",
      COMPANY_DISPLAY_NAME: "Rituals",
      COMPANY_EMAIL: "kontakt@rituals.dk",
      COMPANY_INVOICE_DETAILS: "faktura@rituals.dk (EAN 5790000000000)",
      COMPANY_LEGAL_NAME: "Rituals ApS",
    });
  });

  it("never sends a missing value, only an empty string", () => {
    const variables = companyCompletedVariables(row, "https://example.test");
    expect(variables.COMPANY_CONTACT_NAME).toBe("");
    expect(variables.COMPANY_INVOICE_DETAILS).toBe("");
  });

  it("falls back to the raw interval for an unknown billing method", () => {
    expect(
      companyCompletedVariables(
        { ...row, company_billing_interval: "quarterly" },
        "https://example.test"
      ).COMPANY_BILLING_METHOD
    ).toBe("quarterly");
  });
});
