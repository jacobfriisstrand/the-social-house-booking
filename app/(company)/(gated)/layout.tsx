// The booking gate (#1): every (company) page except the master-data form
// at /company requires company_master_data_completed_at to be set. Layouts
// are not a security boundary; booking actions call the same guard.
import { requireCompletedCompany } from "@/lib/auth/require-company";

export default async function GatedCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedCompany();
  return <>{children}</>;
}
