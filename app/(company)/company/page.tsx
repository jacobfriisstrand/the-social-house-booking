import { MasterDataForm } from "@/components/companies/master-data-form";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { companyToMemberValues } from "@/lib/domain/company-master-data";
import { messages } from "@/messages/da";

export default async function CompanyMasterDataPage() {
  const { company } = await requireOwnCompany();

  return (
    // Centred: companies reach this page before any other screen, so it
    // stands alone until the shell (DESIGN.md) lands.
    <main className="flex flex-col items-center gap-6 p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="font-semibold text-xl">{messages.masterData.title}</h1>
        <MasterDataForm defaultValues={companyToMemberValues(company)} />
      </div>
    </main>
  );
}
