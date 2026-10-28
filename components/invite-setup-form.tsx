"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Control, useController, useForm } from "react-hook-form";
import { masterDataTextFields } from "@/components/companies/company-field-list";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { TermsDialogLink } from "@/components/terms/terms-dialog-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { acceptInvitation } from "@/lib/auth/actions";
import type { TermsVersion } from "@/lib/terms/data";
import {
  type AcceptInvitationValues,
  acceptInvitationSchema,
  type SetPasswordLinkValues,
} from "@/lib/validation/auth";
import { messages } from "@/messages/da";

const labels = messages.companyFields;
const copy = messages.setPassword;

// The token type the link carried: invite for a first invitation, magiclink
// for a resent one (Auth refuses a second invite once the email is
// confirmed). verifyOtp must consume the token under the type it was minted
// with, so the page hands it through and the action reads it back.
type InviteTokenType = Exclude<SetPasswordLinkValues["type"], "recovery">;

// One consent checkbox: the box on the label's line, the policy links
// inside the sentence opening their text in a dialog so the reader never
// leaves the form, the error under the label. Two separate boxes at signup
// so the privacy consent stays unbundleable from the trade terms.
function ConsentField({
  control,
  copyText,
  name,
  version,
}: {
  control: Control<AcceptInvitationValues>;
  copyText: { link: string; start: string };
  name: "termsAccepted" | "privacyAccepted";
  version: TermsVersion | null;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <Field data-invalid={fieldState.invalid} orientation="horizontal">
      <Checkbox
        aria-invalid={fieldState.invalid}
        checked={field.value}
        id={`signup-${name}`}
        name={field.name}
        onCheckedChange={field.onChange}
      />
      <FieldContent>
        <FieldLabel className="font-normal" htmlFor={`signup-${name}`} required>
          {/* One span: the label is a flex row, and the link must stay in
              the sentence's flow. */}
          <span>
            {copyText.start}
            <TermsDialogLink version={version}>{copyText.link}</TermsDialogLink>
          </span>
        </FieldLabel>
        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
      </FieldContent>
    </Field>
  );
}

// The invitation's one page (#1): the shared password and the company's
// master data go in one submit, and the action lands the company logged in.
// The invited email is the login, so it is not on the form; the action
// injects it from the company row. The two consents close the form: the
// trade terms are accepted and the privacy policy confirmed as read, each
// opening its current published version in a dialog. Errors land back here
// as field errors while the session stays alive, so a retry does not need
// the link again.
export function InviteSetupForm({
  terms,
  tokenHash,
  tokenType,
}: {
  terms: {
    "Terms of trade": TermsVersion | null;
    "Privacy policy": TermsVersion | null;
  };
  tokenHash: string;
  tokenType: InviteTokenType;
}) {
  const form = useForm<AcceptInvitationValues>({
    defaultValues: {
      attention: "",
      billingAddress: "",
      billingCity: "",
      billingCountry: labels.defaultCountry,
      billingNotes: "",
      billingPostalCode: "",
      contactName: "",
      contactPhone: "",
      cvrNumber: "",
      department: "",
      invoiceEmail: "",
      legalName: "",
      password: "",
      passwordConfirm: "",
      privacyAccepted: false,
      reference: "",
      termsAccepted: false,
      tokenHash,
      tokenType,
    },
    resolver: zodResolver(acceptInvitationSchema),
  });
  const { pending, submit } = useFormAction({ action: acceptInvitation, form });

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <TextField
              autoComplete="new-password"
              control={form.control}
              label={copy.password}
              name="password"
              type="password"
            />
            <TextField
              autoComplete="new-password"
              control={form.control}
              label={copy.passwordConfirm}
              name="passwordConfirm"
              type="password"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.masterData.title}</CardTitle>
          <CardDescription>{messages.masterData.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {masterDataTextFields.map((spec) => (
              <TextField control={form.control} key={spec.name} {...spec} />
            ))}
            <TextareaField
              control={form.control}
              label={labels.billingNotes}
              name="billingNotes"
              required={false}
            />
            <ConsentField
              control={form.control}
              copyText={copy.consentTerms}
              name="termsAccepted"
              version={terms["Terms of trade"]}
            />
            <ConsentField
              control={form.control}
              copyText={copy.consentPrivacy}
              name="privacyAccepted"
              version={terms["Privacy policy"]}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button pending={pending} type="submit">
            {pending ? copy.submitting : copy.inviteSubmit}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
