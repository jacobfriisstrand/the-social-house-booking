// The Virksomheder list as a download (#123): the same rows the companies
// page reads (listAdminCompanies), under the admin session's RLS, as CSV
// or PDF on ?format=pdf. Route handlers run outside the (admin) layout,
// so the admin check happens here (docs/agents/auth.md).

import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { listAdminCompanies } from "@/lib/companies/admin-data";
import { companiesTable } from "@/lib/companies/admin-export";
import { cphDate } from "@/lib/domain/opening-hours";
import { toCsv } from "@/lib/export/csv";
import { renderTablePdf } from "@/lib/export/pdf";
import { fileResponse } from "@/lib/export/response";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// The ticked companies' export: the read is catalogue-sized (the list's
// own cap), so the route reads it whole and picks the posted ids — no
// per-id query.
const exportSelectionSchema = z.object({
  companyIds: z.array(z.guid()).min(1).max(10_000),
  format: z.enum(["csv", "pdf"]),
});

// The ticked rows' export (#123): the ids arrive in the order the table
// displayed them, and the export keeps that order. The admin guard is the
// same as the GET's, and the read still runs under the admin session's
// RLS.
export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const parsed = exportSelectionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return new Response(messages.common.invalidRequest, { status: 400 });
  }
  const supabase = await createClient();
  const companies = await listAdminCompanies(supabase);
  const byId = new Map(
    companies.map((company) => [company.company_id, company])
  );
  // A posted id the read cannot see (RLS or a raced delete) drops out
  // instead of failing the whole export.
  const ordered = parsed.data.companyIds
    .map((id) => byId.get(id))
    .filter((company) => company !== undefined);
  const table = companiesTable(ordered);
  const today = cphDate(new Date());
  if (parsed.data.format === "pdf") {
    return fileResponse(
      await renderTablePdf({ table, title: messages.companies.title }),
      `virksomheder-${today}.pdf`,
      "application/pdf"
    );
  }
  return fileResponse(
    toCsv(table),
    `virksomheder-${today}.csv`,
    "text/csv; charset=utf-8"
  );
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const supabase = await createClient();
  const companies = await listAdminCompanies(supabase);
  const table = companiesTable(companies);
  const today = cphDate(new Date());
  if (new URL(request.url).searchParams.get("format") === "pdf") {
    return fileResponse(
      await renderTablePdf({ table, title: messages.companies.title }),
      `virksomheder-${today}.pdf`,
      "application/pdf"
    );
  }
  return fileResponse(
    toCsv(table),
    `virksomheder-${today}.csv`,
    "text/csv; charset=utf-8"
  );
}
