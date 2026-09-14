// Mail 10 (#1): tells ADMIN_NOTIFY_EMAIL that a company has completed its
// master data. Called once, on the null-to-set transition of
// company_master_data_completed_at. A send failure never blocks the company;
// the failed row is in outbound_emails and Sentry gets the error keyed on
// company_id only (docs/agents/stack.md).
import { captureException } from "@sentry/nextjs";
import {
  type CompanyRow,
  companyCompletedVariables,
} from "@/lib/domain/company-master-data";
import { sendMail } from "@/lib/email/send-mail";
import { env } from "@/lib/env";

export async function notifyAdminCompanyCompleted(
  company: CompanyRow
): Promise<void> {
  const tags = { company_id: company.company_id };
  const to = env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    captureException(
      new Error("ADMIN_NOTIFY_EMAIL is not set; Mail 10 was not sent"),
      { tags }
    );
    return;
  }
  const actionUrl = `${env.NEXT_PUBLIC_SITE_URL}/admin/companies/${company.company_id}`;
  try {
    await sendMail({
      companyId: company.company_id,
      kind: "admin-company-completed",
      to,
      variables: companyCompletedVariables(company, actionUrl),
    });
  } catch (error) {
    captureException(error, { tags });
  }
}
