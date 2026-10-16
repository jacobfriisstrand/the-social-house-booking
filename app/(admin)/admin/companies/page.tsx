import type { Metadata } from "next";
import { CompanyTable } from "@/components/companies/company-table";
import { CreateCompanySheet } from "@/components/companies/create-company-sheet";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { listAdminCompanies } from "@/lib/companies/admin-data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.companies;

export const metadata: Metadata = {
  title: copy.title,
};

// Virksomheder (admin): every company with status and master-data state.
// The sheet carries the company's information — no dedicated page; Mail 10
// and a failed first invite point back at this list (DESIGN.md: admin edit
// in a dialog or a sheet).
export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const [{ invite }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const companies = await listAdminCompanies(supabase);

  return (
    <>
      {invite === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>{copy.errors.inviteFailed}</AlertDescription>
        </Alert>
      ) : null}
      <PageHeader title={copy.title}>
        <ExportMenu href="/admin/companies/export" />
        <CreateCompanySheet />
      </PageHeader>
      <PagePanel>
        {companies.length ? (
          <CompanyTable companies={companies} />
        ) : (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <CardTitle>{copy.emptyTitle}</CardTitle>
              <CardDescription>{copy.emptyDescription}</CardDescription>
            </CardContent>
          </Card>
        )}
      </PagePanel>
    </>
  );
}
