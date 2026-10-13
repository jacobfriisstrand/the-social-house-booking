import { describe, expect, it } from "vitest";
import { messages } from "@/messages/da";
import {
  type MarkInvoicedValues,
  markInvoicedSchema,
  resolvedInvoiceNumbers,
} from "./invoicing";

// The admin's example: three bookings for one company, two for another,
// five for a third — company mode shares one number per company, per-booking
// mode gives every booking its own.
const bookingIds = [
  "66666666-6666-6666-6666-666666666101",
  "66666666-6666-6666-6666-666666666102",
  "66666666-6666-6666-6666-666666666103",
  "66666666-6666-6666-6666-666666666104",
  "66666666-6666-6666-6666-666666666105",
] as const;

const bookingCompanies = {
  [bookingIds[0]]: "c1",
  [bookingIds[1]]: "c1",
  [bookingIds[2]]: "c1",
  [bookingIds[3]]: "c2",
  [bookingIds[4]]: "c2",
};

const companyNumbers = { c1: "10001", c2: "10002" };

const invoiceNumbers = {
  [bookingIds[0]]: "20001",
  [bookingIds[1]]: "20002",
  [bookingIds[2]]: "20003",
  [bookingIds[3]]: "20004",
  [bookingIds[4]]: "20005",
};

const base: MarkInvoicedValues = {
  bookingCompanies,
  bookingIds: [...bookingIds],
  companyMode: true,
  companyNumbers,
  invoiceDate: "2026-10-09",
  invoiceNumbers,
};

const errorsOf = (values: Record<string, unknown>) => {
  const result = markInvoicedSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

const { errors } = messages.bookings.admin.markInvoiced;

describe("resolvedInvoiceNumbers", () => {
  it("shares one number per company in company mode", () => {
    expect([...resolvedInvoiceNumbers(base)]).toEqual([
      [bookingIds[0], "10001"],
      [bookingIds[1], "10001"],
      [bookingIds[2], "10001"],
      [bookingIds[3], "10002"],
      [bookingIds[4], "10002"],
    ]);
  });

  it("gives every booking its own number in per-booking mode", () => {
    expect([
      ...resolvedInvoiceNumbers({ ...base, companyMode: false }),
    ]).toEqual([
      [bookingIds[0], "20001"],
      [bookingIds[1], "20002"],
      [bookingIds[2], "20003"],
      [bookingIds[3], "20004"],
      [bookingIds[4], "20005"],
    ]);
  });

  it("ignores the company mapping in per-booking mode", () => {
    const withoutCompanies = {
      ...base,
      bookingCompanies: {} as MarkInvoicedValues["bookingCompanies"],
      companyMode: false,
    };
    expect([...resolvedInvoiceNumbers(withoutCompanies)]).toEqual([
      [bookingIds[0], "20001"],
      [bookingIds[1], "20002"],
      [bookingIds[2], "20003"],
      [bookingIds[3], "20004"],
      [bookingIds[4], "20005"],
    ]);
  });

  it("trims the numbers", () => {
    expect(
      resolvedInvoiceNumbers({
        ...base,
        companyNumbers: { c1: " 10001 ", c2: "10002" },
      }).get(bookingIds[0])
    ).toBe("10001");
  });
});

describe("markInvoicedSchema", () => {
  it("accepts the company-mode selection", () => {
    expect(errorsOf(base)).toEqual([]);
  });

  it("rejects company mode when a booking lacks its company mapping", () => {
    const unmapped = { [bookingIds[0]]: "c1" } as Record<string, string>;
    const result = markInvoicedSchema.safeParse({
      ...base,
      bookingCompanies: unmapped,
    });
    expect(result.success).toBe(false);
  });

  it("rejects company mode when a company field is empty", () => {
    expect(
      errorsOf({ ...base, companyNumbers: { c1: "10001", c2: "" } })
    ).toEqual([errors.numberRequired]);
  });

  it("rejects per-booking mode when a booking field is empty", () => {
    expect(
      errorsOf({
        ...base,
        companyMode: false,
        invoiceNumbers: { ...invoiceNumbers, [bookingIds[4]]: "" },
      })
    ).toEqual([errors.numberRequired]);
  });

  // The break regression: one issue per empty field, so every untouched
  // field shows its own error — two empty company fields are two issues at
  // two distinct paths, and N-1 silent fields never return.
  it("flags every empty company field, one issue at each path", () => {
    const result = markInvoicedSchema.safeParse({
      ...base,
      companyNumbers: { c1: undefined, c2: undefined },
    });
    if (result.success) {
      throw new Error("expected parse failure");
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      errors.numberRequired,
      errors.numberRequired,
    ]);
    expect(result.error.issues.map((issue) => issue.path)).toEqual([
      ["companyNumbers", "c1"],
      ["companyNumbers", "c2"],
    ]);
  });

  it("flags every empty per-booking field without duplicate paths", () => {
    const result = markInvoicedSchema.safeParse({
      ...base,
      companyMode: false,
      // undefined values, not "": pins the widened z.string().optional()
      // (invoicing.ts:33) — untouched fields stay as strings, three
      // overrides feed undefined, and the loop flags exactly those three.
      invoiceNumbers: {
        ...invoiceNumbers,
        [bookingIds[0]]: undefined,
        [bookingIds[1]]: undefined,
        [bookingIds[2]]: undefined,
      },
    });
    if (result.success) {
      throw new Error("expected parse failure");
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      errors.numberRequired,
      errors.numberRequired,
      errors.numberRequired,
    ]);
    expect(result.error.issues.map((issue) => issue.path)).toEqual([
      ["invoiceNumbers", bookingIds[0]],
      ["invoiceNumbers", bookingIds[1]],
      ["invoiceNumbers", bookingIds[2]],
    ]);
  });

  // Company mode with several bookings sharing one company id: the issue
  // lands once at the shared path, not once per booking.
  it("dedupes company-mode issues across bookings of one company", () => {
    const result = markInvoicedSchema.safeParse({
      ...base,
      companyNumbers: { c1: "", c2: "10002" },
    });
    if (result.success) {
      throw new Error("expected parse failure");
    }
    expect(result.error.issues.map((issue) => issue.path)).toEqual([
      ["companyNumbers", "c1"],
    ]);
  });
});
