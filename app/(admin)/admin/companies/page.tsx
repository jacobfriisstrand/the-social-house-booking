import { CompanySheet } from "@/components/companies/company-sheet";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    .order("company_display_name");

  return (
    <>
      {invite === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>{copy.errors.inviteFailed}</AlertDescription>
        </Alert>
      ) : null}
      <PageHeader title={copy.title}>
        <CreateCompanyDialog />
      </PageHeader>
      <PagePanel>
        {companies?.length ? (
          <Card className="overflow-x-auto py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.columns.displayName}</TableHead>
                  <TableHead>{copy.columns.email}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead className="text-right">
                    {copy.columns.discount}
                  </TableHead>
                  <TableHead>{copy.columns.masterData}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.company_id}>
                    <TableCell className="font-medium">
                      <CompanySheet company={company} />
                    </TableCell>
                    <TableCell>{company.company_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {copy.membership[company.company_membership_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company.company_discount_percent} %
                    </TableCell>
                    <TableCell>
                      {company.company_master_data_completed_at ? (
                        <Badge
                          className="bg-success/10 text-success"
                          variant="outline"
                        >
                          {copy.masterDataComplete}
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-warning/20 text-warning-foreground"
                          variant="outline"
                        >
                          {copy.masterDataMissing}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
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
