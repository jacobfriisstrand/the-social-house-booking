import { describe, expect, it } from "vitest";
import { companyChangeBeforeSchema, memberCompanySchema } from "./company";

const values = {
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
  email: "kontakt@rituals.dk",
  invoiceEmail: "faktura@rituals.dk",
  legalName: "Rituals ApS",
  reference: "RIT-2024",
};

describe("company change review snapshots", () => {
  it("accepts incomplete historical master data", () => {
    const result = companyChangeBeforeSchema.safeParse({
      ...values,
      contactPhone: "",
      invoiceEmail: "",
    });

    expect(result.success).toBe(true);
  });

  it("keeps submitted member data strict", () => {
    const result = memberCompanySchema.safeParse({
      ...values,
      contactPhone: "",
      invoiceEmail: "",
    });

    expect(result.success).toBe(false);
  });
});
