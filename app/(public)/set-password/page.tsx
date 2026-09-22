import { SetPasswordForm } from "@/components/set-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setPasswordLinkSchema } from "@/lib/validation/auth";
import { messages } from "@/messages/da";

// Target of the invite (and later recovery) link the Send Email Hook builds:
// /set-password?token_hash=…&type=invite is used by the custom Send Email
// Hook. Local Auth uses PKCE and redirects here with ?code=… instead. Neither
// credential is consumed during page render; the Server Action consumes it
// when the password form is submitted.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const link = setPasswordLinkSchema.safeParse({
    code: params.code,
    tokenHash: params.token_hash,
    type: params.type ?? (params.code ? "recovery" : undefined),
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {link.success ? (
          <SetPasswordForm link={link.data} />
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
