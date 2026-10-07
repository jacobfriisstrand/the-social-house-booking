import { describe, expect, it } from "vitest";
import {
  acceptedVersionIds,
  currentVersionIds,
  nextTermsVersion,
} from "./terms";

const BOOKING_TERMS_V2 = { name: "Booking terms", versionId: "bt-2" };
const BOOKING_TERMS_V3 = { name: "Booking terms", versionId: "bt-3" };
const PRIVACY_POLICY_V1 = { name: "Privacy policy", versionId: "pp-1" };
const GDPR_OVERVIEW_V1 = { name: "GDPR overview", versionId: "gdpr-1" };
const PUBLISHED = [
  BOOKING_TERMS_V2,
  BOOKING_TERMS_V3,
  PRIVACY_POLICY_V1,
  GDPR_OVERVIEW_V1,
];

describe("acceptedVersionIds: what the booker accepts on Book nu", () => {
  it("accepts the booking terms and privacy policy the dialog showed", () => {
    expect(acceptedVersionIds(["pp-1", "bt-3"], PUBLISHED)).toEqual([
      "bt-3",
      "pp-1",
    ]);
  });

  it("records an older published version when that is what was shown", () => {
    expect(acceptedVersionIds(["bt-2", "pp-1"], PUBLISHED)).toEqual([
      "bt-2",
      "pp-1",
    ]);
  });

  it("refuses when the privacy policy was not shown", () => {
    expect(acceptedVersionIds(["bt-3"], PUBLISHED)).toBeNull();
  });

  it("refuses an id that is not a published version (a draft or made up)", () => {
    expect(acceptedVersionIds(["bt-3", "pp-draft"], PUBLISHED)).toBeNull();
  });

  it("refuses two booking terms versions in place of the privacy policy", () => {
    expect(acceptedVersionIds(["bt-2", "bt-3"], PUBLISHED)).toBeNull();
  });

  it("refuses a document the booker is not asked to accept", () => {
    expect(
      acceptedVersionIds(["bt-3", "pp-1", "gdpr-1"], PUBLISHED)
    ).toBeNull();
  });
});

describe("currentVersionIds: the version of each text the dialog links", () => {
  it("takes the newest published version of each text", () => {
    // Newest first, as the read orders them.
    const newestFirst = [
      BOOKING_TERMS_V3,
      PRIVACY_POLICY_V1,
      BOOKING_TERMS_V2,
      GDPR_OVERVIEW_V1,
    ];
    expect(currentVersionIds(newestFirst)).toEqual({
      "Booking terms": "bt-3",
      "GDPR overview": "gdpr-1",
      "Privacy policy": "pp-1",
    });
  });

  it("leaves out a text never published and ignores unknown names", () => {
    expect(
      currentVersionIds([
        BOOKING_TERMS_V3,
        { name: "House rules", versionId: "hr-1" },
      ])
    ).toEqual({ "Booking terms": "bt-3" });
  });
});

describe("nextTermsVersion: each save publishes the next number", () => {
  it("starts at 1", () => {
    expect(nextTermsVersion(null)).toBe("1");
  });

  it("counts up from the latest version", () => {
    expect(nextTermsVersion("2")).toBe("3");
  });

  it("counts as numbers, not text", () => {
    expect(nextTermsVersion("9")).toBe("10");
  });
});
