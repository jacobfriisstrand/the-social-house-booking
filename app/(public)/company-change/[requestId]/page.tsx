import { CompanyChangeReview } from "@/components/company-change-review";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getCompanyChangeReview,
  isNewEmailChangeToken,
  verifyNewCompanyEmail,
} from "@/lib/companies/change-actions";
import { messages } from "@/messages/da";

export default async function CompanyChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ requestId }, { token }] = await Promise.all([params, searchParams]);
  if (!token) {
    return <InvalidChange />;
  }
  const review = await getCompanyChangeReview(requestId, token);
  if (review) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-2xl">
          <CompanyChangeReview review={review} token={token} />
        </div>
      </main>
    );
  }

  if (await isNewEmailChangeToken(requestId, token)) {
    await verifyNewCompanyEmail(requestId, token);
    return <InvalidChange />;
  }
  return <InvalidChange />;
}

function InvalidChange() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Alert className="w-full max-w-sm" variant="destructive">
        <AlertTitle>{messages.companyChangeReview.invalid}</AlertTitle>
        <AlertDescription>
          {messages.companyChangeReview.errors.invalid}
        </AlertDescription>
      </Alert>
    </main>
  );
}
