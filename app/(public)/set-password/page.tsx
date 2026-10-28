import type { Metadata } from "next";
import { InviteSetupForm } from "@/components/invite-setup-form";
import { SetPasswordForm } from "@/components/set-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentTerms,
  getTermsVersion,
  type TermsVersion,
} from "@/lib/terms/data";
import { setPasswordLinkSchema } from "@/lib/validation/auth";
import { messages } from "@/messages/da";

type SearchParams = Promise<{
  code?: string;
  token_hash?: string;
  type?: string;
}>;

// The link credentials decide everything downstream: which form renders and
// what the tab is called. One parse for the page and the metadata, so the
// two can never disagree about the flow.
const parseLink = (params: {
  code?: string;
  token_hash?: string;
  type?: string;
}) =>
  setPasswordLinkSchema.safeParse({
    code: params.code,
    tokenHash: params.token_hash,
    type: params.type ?? (params.code ? "recovery" : undefined),
  });

// The published versions the signup consents open in a dialog: a text
// without a published version stays null (the booking dialog rule), and the
// schema still refuses the signup without the consent.
const loadConsentVersions = async (): Promise<{
  "Privacy policy": TermsVersion | null;
  "Terms of trade": TermsVersion | null;
}> => {
  const supabase = await createClient();
  const terms = await getCurrentTerms();
  const [tradeVersion, privacyVersion] = await Promise.all([
    terms["Terms of trade"]
      ? getTermsVersion(supabase, terms["Terms of trade"])
      : null,
    terms["Privacy policy"]
      ? getTermsVersion(supabase, terms["Privacy policy"])
      : null,
  ]);
  return { "Privacy policy": privacyVersion, "Terms of trade": tradeVersion };
};

// An invitation is the company signup and titles as one; a recovery link
// keeps the password title. The parse ignores an invalid link — the page
// renders its error alert either way.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const link = parseLink(await searchParams);
  const title =
    link.success && link.data.type === "recovery"
      ? messages.setPassword.title
      : messages.setPassword.signupTitle;
  return { title };
}

// Target of the invite (and later recovery) link the Send Email Hook builds:
// /set-password?token_hash=…&type=invite is used by the custom Send Email
// Hook. Local Auth uses PKCE and redirects here with ?code=… instead. Neither
// credential is consumed during page render; the Server Action consumes it
// when the form is submitted.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const link = parseLink(params);

  // The centred shell lives in app/(public)/layout.tsx (#89); the page is
  // content only. An invitation gets the password and the master data in one
  // form (#1) — a resent invitation arrives as a magiclink token and gets
  // the same form. Recovery keeps the password-only form. The shells of the
  // login and company-change pages set the width precedent for each.
  if (!link.success) {
    return (
      <Alert className="w-full max-w-sm" variant="destructive">
        <AlertTitle>{messages.setPassword.title}</AlertTitle>
        <AlertDescription>
          {messages.setPassword.errors.linkInvalid}
        </AlertDescription>
      </Alert>
    );
  }
  const linkData = link.data;
  if (linkData.type !== "recovery") {
    // The consents open the current published versions in a dialog, so the
    // reader sees exactly the text the checkbox names and keeps the form
    // state while reading.
    const terms = await loadConsentVersions();
    return (
      <div className="w-full max-w-2xl">
        <InviteSetupForm
          terms={terms}
          tokenHash={linkData.tokenHash}
          tokenType={linkData.type}
        />
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm">
      <SetPasswordForm link={linkData} />
    </div>
  );
}
