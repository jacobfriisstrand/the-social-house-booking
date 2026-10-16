// The Virksomheder list as a CSV or PDF download (#123): the same rows the
// companies page reads (listAdminCompanies), under the admin session's
// RLS, or the ticked selection on POST. Route handlers run outside the
// (admin) layout, so the admin check happens in the shared gate
// (docs/agents/auth.md).

import { requireAdminApi } from "@/lib/auth/require-admin";
import { listAdminCompanies } from "@/lib/companies/admin-data";
import { companiesTable } from "@/lib/companies/admin-export";
import { cphDate } from "@/lib/domain/opening-hours";
import {
  exportResponse,
  exportSchemas,
  readExportSelection,
} from "@/lib/export/response";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const supabase = await createClient();
  const companies = await listAdminCompanies(supabase);
  return exportResponse(companiesTable(companies), {
    base: "virksomheder",
    format:
      new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "csv",
    title: messages.companies.title,
    today: cphDate(new Date()),
  });
}

// The ticked companies' export: the read is catalogue-sized (the list's
// own cap), so the route reads it whole and picks the posted ids in the
// order they arrived. A posted id the read cannot see (RLS or a raced
// delete) drops out instead of failing the whole export.
export async function POST(request: Request): Promise<Response> {
  const selection = await readExportSelection(request, exportSchemas.companies);
  if (selection instanceof Response) {
    return selection;
  }
  const supabase = await createClient();
  const companies = await listAdminCompanies(supabase);
  const byId = new Map(
    companies.map((company) => [company.company_id, company])
  );
  const ordered = selection.companyIds
    .map((id) => byId.get(id))
    .filter((company) => company !== undefined);
  return exportResponse(companiesTable(ordered), {
    base: "virksomheder",
    format: selection.format,
    title: messages.companies.title,
    today: cphDate(new Date()),
  });
}
