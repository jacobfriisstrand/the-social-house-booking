import Link from "next/link";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";
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

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select(
      "company_id, company_display_name, company_email, company_membership_status, company_discount_percent, company_master_data_completed_at"
    )
    .order("company_display_name");

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-semibold text-3xl">{copy.title}</h1>
        <CreateCompanyDialog />
      </div>

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
                    <Link
                      className="underline-offset-4 hover:underline"
                      href={`/admin/companies/${company.company_id}`}
                    >
                      {company.company_display_name}
                    </Link>
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
    </main>
  );
}
