// The booking schemas' acceptance split: the member flow requires the
// active acceptances (#7, #15), the admin flow carries none — admin
// accepts nothing on a company's behalf (ADR-0023). Also the quantity
// record: an untouched stepper registers its key with an undefined value,
// which the strict record rejects, so the form prunes those keys before
// validating — an absent quantity is the headcount default (#119).
import { describe, expect, it } from "vitest";
import {
  adminBookingSchema,
  createHoldSchema,
  pruneAddOnQuantities,
} from "./booking";

// Future and grid-aligned: the window rule needs a slot ahead of now,
// inside the 12-month horizon, on the hour.
const startAt = (): string => {
  const start = new Date();
  start.setMonth(start.getMonth() + 2);
  start.setMinutes(0, 0, 0);
  return start.toISOString();
};

const base = () => ({
  addOnIds: [],
  bookerEmail: "peter@rituals.dk",
  bookerName: "Peter Pedersen",
  bookerPhone: "+45 2010 2030",
  endAt: new Date(new Date(startAt()).getTime() + 3_600_000).toISOString(),
  participantCount: 8,
  roomId: "00000000-0000-0000-0000-0000000000c1",
  startAt: startAt(),
});

const LUNCH = "00000000-0000-0000-0000-0000000000a1";
const COFFEE = "00000000-0000-0000-0000-0000000000a2";

describe("the member flow requires the active acceptances", () => {
  it("fails without the catering acceptance", () => {
    const result = createHoldSchema.safeParse({
      ...base(),
      termsAccepted: true,
      termsVersionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("fails without the terms acceptance", () => {
    const result = createHoldSchema.safeParse({
      ...base(),
      cateringAccepted: true,
      termsVersionIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("the admin flow carries no acceptances (ADR-0023)", () => {
  it("parses without the acceptance keys and strips them", () => {
    const result = adminBookingSchema.safeParse({
      ...base(),
      cateringAccepted: false,
      companyId: "00000000-0000-0000-0000-0000000000c1",
      termsAccepted: false,
      termsVersionIds: ["00000000-0000-0000-0000-0000000000d1"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("cateringAccepted" in result.data).toBe(false);
      expect("termsAccepted" in result.data).toBe(false);
      expect("termsVersionIds" in result.data).toBe(false);
    }
  });
});

describe("the quantity record stays strict for the server", () => {
  const member = {
    ...base(),
    addOnIds: [LUNCH],
    cateringAccepted: true,
    termsAccepted: true,
    termsVersionIds: [],
  };

  it("rejects an undefined value, so the form must prune first", () => {
    const result = createHoldSchema.safeParse({
      ...member,
      addOnIds: [LUNCH, COFFEE],
      addOnQuantities: { [LUNCH]: 6, [COFFEE]: undefined },
    });
    expect(result.success).toBe(false);
  });

  it("prunes the untouched stepper's key to the headcount default", () => {
    const pruned = pruneAddOnQuantities({
      addOnQuantities: { [LUNCH]: 6, [COFFEE]: undefined },
    });
    expect(pruned).toEqual({ addOnQuantities: { [LUNCH]: 6 } });
  });

  it("prunes a record of only untouched steppers to an empty one", () => {
    const pruned = pruneAddOnQuantities({
      addOnQuantities: { [LUNCH]: undefined, [COFFEE]: undefined },
    });
    expect(pruned).toEqual({ addOnQuantities: {} });
  });
});
