import { describe, expect, it } from "vitest";
import {
  membershipCompanyIds,
  selectedCompanyIds,
} from "./admin-company-filter";
import type { AdminFilterOptions } from "./admin-data";

const options: AdminFilterOptions = {
  companies: [
    {
      companyId: "00000000-0000-0000-0000-0000000000m1",
      displayName: "Member Co",
      membershipStatus: "member",
    },
    {
      companyId: "00000000-0000-0000-0000-0000000000e1",
      displayName: "External Co",
      membershipStatus: "external",
    },
  ],
  rooms: [],
};

const member = "00000000-0000-0000-0000-0000000000m1";
const external = "00000000-0000-0000-0000-0000000000e1";

describe("selectedCompanyIds", () => {
  it("no company-ish filter resolves to null (show everything)", () => {
    expect(
      selectedCompanyIds({ companyIds: [], memberships: [] }, options)
    ).toBeNull();
  });

  it("a membership type alone selects its companies", () => {
    expect(
      selectedCompanyIds({ companyIds: [], memberships: ["member"] }, options)
    ).toEqual([member]);
  });

  it("picked companies alone pass through", () => {
    expect(
      selectedCompanyIds({ companyIds: [external], memberships: [] }, options)
    ).toEqual([external]);
  });

  it("a membership type and picked companies intersect", () => {
    expect(
      selectedCompanyIds(
        { companyIds: [member, external], memberships: ["member"] },
        options
      )
    ).toEqual([member]);
  });

  it("picked companies holding none of the chosen types match nothing", () => {
    expect(
      selectedCompanyIds(
        { companyIds: [external], memberships: ["member"] },
        options
      )
    ).toEqual([]);
  });

  it("membershipCompanyIds resolves each type", () => {
    expect(membershipCompanyIds(options, ["external", "member"])).toEqual([
      member,
      external,
    ]);
  });
});
