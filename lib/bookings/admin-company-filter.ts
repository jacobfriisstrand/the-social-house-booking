// The company-ish filter resolution for the admin booking overview (#9):
// pure id arithmetic — the membership types an admin picked resolve to
// company ids, and the two company-ish filters intersect. PostgREST
// cannot filter on an embedded column without mangling the embed (rows
// come back with `companies: null`), so the membership filter is an id
// list on the owning column.

import type { AdminFilterOptions } from "@/lib/bookings/admin-data";
import type { AdminMembership } from "@/lib/domain/admin-bookings";

/**
 * The company ids a membership filter selects, resolved from the options:
 * Several selected types union.
 */
export function membershipCompanyIds(
  options: AdminFilterOptions,
  memberships: readonly AdminMembership[]
): string[] {
  const wanted = new Set(memberships);
  return options.companies
    .filter((company) => wanted.has(company.membershipStatus))
    .map((company) => company.companyId);
}

export interface CompanyFilterPick {
  companyIds: readonly string[];
  memberships: readonly AdminMembership[];
}

/** The company ids the two company-ish filters select together, or null
 * when neither filter is active (show everything). The picked companies
 * and the picked membership types intersect — a booking's company must
 * answer to both. With only a membership type picked, the membership ids
 * are the filter; an empty result is a real empty match (nothing shows),
 * never "no filter" — that conflation is what once let every booking
 * through a Medlemmer selection. */
export function selectedCompanyIds(
  filter: CompanyFilterPick,
  options: AdminFilterOptions
): string[] | null {
  if (filter.companyIds.length === 0 && filter.memberships.length === 0) {
    return null;
  }
  if (filter.companyIds.length === 0) {
    return membershipCompanyIds(options, filter.memberships);
  }
  if (filter.memberships.length === 0) {
    return [...filter.companyIds];
  }
  const allowed = new Set(membershipCompanyIds(options, filter.memberships));
  return filter.companyIds.filter((companyId) => allowed.has(companyId));
}
