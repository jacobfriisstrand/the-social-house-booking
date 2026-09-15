import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CompanyForm } from "@/components/companies/company-form";
import { ResendInvitationButton } from "@/components/companies/resend-invitation-button";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { companyToAdminValues } from "@/lib/domain/company-master-data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.companies;

export default async function AdminCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const [{ id }, { invite }] = await Promise.all([params, searchParams]);
  if (!z.guid().safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("company_id", id)
    .maybeSingle();
  if (!company) {
    notFound();
  }

  return (
    <>
      <div>
        <Button
          nativeButton={false}
          render={<Link href="/admin/companies" />}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft data-icon="inline-start" />
          {copy.back}
        </Button>
      </div>
      <PageHeader title={company.company_display_name}>
        <ResendInvitationButton companyId={company.company_id} />
      </PageHeader>
      {invite === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>{copy.errors.inviteFailed}</AlertDescription>
        </Alert>
      ) : null}
      <PagePanel>
        <div className="max-w-2xl">
          <CompanyForm defaultValues={companyToAdminValues(company)} />
        </div>
      </PagePanel>
    </>
  );
}
