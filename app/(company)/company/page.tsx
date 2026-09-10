import { MasterDataForm } from "@/components/companies/master-data-form";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { companyToMasterDataValues } from "@/lib/domain/company-master-data";
import { messages } from "@/messages/da";

export default async function CompanyMasterDataPage() {
  const { company } = await requireOwnCompany();

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-semibold text-3xl">{messages.masterData.title}</h1>
      <div className="max-w-2xl">
        <MasterDataForm
          defaultValues={companyToMasterDataValues(company)}
          email={company.company_email}
        />
      </div>
    </main>
  );
}
