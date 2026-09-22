import { CompanySecuritySection } from "@/components/companies/company-security-section";
import { MasterDataForm } from "@/components/companies/master-data-form";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { companyToMemberValues } from "@/lib/domain/company-master-data";
import { messages } from "@/messages/da";

export default async function CompanySettingsPage() {
  const { company } = await requireOwnCompany();

  return (
    <>
      <PageHeader title={messages.companySettings.title} />
      <PagePanel>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <MasterDataForm defaultValues={companyToMemberValues(company)} />
          <CompanySecuritySection />
        </div>
      </PagePanel>
    </>
  );
}
