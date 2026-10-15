import { describe, expect, it } from "vitest";
import { messages } from "@/messages/da";
import { addManualAmountSchema } from "./manual-amounts";

const valid = {
  amountKroner: 250,
  bookingId: "66666666-6666-6666-6666-666666666001",
  note: "Ekstra rengøring efter mødet.",
};

const errorsOf = (values: Record<string, unknown>) => {
  const result = addManualAmountSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

describe("addManualAmountSchema", () => {
  it("accepts a whole-kroner amount with a note", () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it("refuses a zero or negative amount", () => {
    expect(errorsOf({ ...valid, amountKroner: 0 })).toEqual([
      messages.bookings.admin.manualAmounts.errors.amountInvalid,
    ]);
    expect(errorsOf({ ...valid, amountKroner: -250 })).toEqual([
      messages.bookings.admin.manualAmounts.errors.amountInvalid,
    ]);
  });

  it("refuses a fraction of a kroner", () => {
    expect(errorsOf({ ...valid, amountKroner: 250.5 })).toEqual([
      messages.bookings.admin.manualAmounts.errors.amountInvalid,
    ]);
  });

  it("refuses an empty explanation", () => {
    expect(errorsOf({ ...valid, note: "  " })).toEqual([
      messages.bookings.admin.manualAmounts.errors.noteRequired,
    ]);
  });
});
