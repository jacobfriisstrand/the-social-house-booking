import { SetPasswordForm } from "@/components/set-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setPasswordLinkSchema } from "@/lib/validation/auth";
import { messages } from "@/messages/da";

// Target of the invite (and later recovery) link the Send Email Hook builds:
// /set-password?token_hash=…&type=invite. The token is consumed in the
// action, not here, so a page load never burns the single-use link.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const params = await searchParams;
  const link = setPasswordLinkSchema.safeParse({
    tokenHash: params.token_hash,
    type: params.type,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {link.success ? (
          <SetPasswordForm
            tokenHash={link.data.tokenHash}
            type={link.data.type}
          />
        ) : (
          <Alert variant="destructive">
            <AlertTitle>{messages.setPassword.title}</AlertTitle>
            <AlertDescription>
              {messages.setPassword.errors.linkInvalid}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
