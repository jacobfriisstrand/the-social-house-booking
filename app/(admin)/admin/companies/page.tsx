import { CompanyTable } from "@/components/companies/company-table";
import { CreateCompanySheet } from "@/components/companies/create-company-sheet";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.companies;

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
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("company_display_name")
    // Bounded: the list is catalogue-sized; paginate in a follow-up if a
    // tenant ever approaches the cap.
    .limit(500);

  return (
    <>
      {invite === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>{copy.errors.inviteFailed}</AlertDescription>
        </Alert>
      ) : null}
      <PageHeader title={copy.title}>
        <CreateCompanySheet />
      </PageHeader>
      <PagePanel>
        {companies?.length ? (
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
