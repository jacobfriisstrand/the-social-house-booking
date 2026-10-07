"use client";

// Edit one text (admin, #15; DESIGN.md "Betingelser (admin)"): the current
// version's text in a textarea; saving publishes it as the next version.
// One schema with the server action (lib/validation/terms.ts).
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PendingButton } from "@/components/forms/pending-button";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { FieldGroup } from "@/components/ui/field";
import { publishTermsVersion } from "@/lib/terms/actions";
import { type TermsFormValues, termsFormSchema } from "@/lib/validation/terms";
import { messages } from "@/messages/da";

const copy = messages.terms;

export function TermsForm({ content, name }: TermsFormValues) {
  const form = useForm<TermsFormValues>({
    defaultValues: { content, name },
    resolver: zodResolver(termsFormSchema),
  });
  const { pending, submit } = useFormAction({
    action: publishTermsVersion,
    form,
    successMessage: copy.admin.saved,
  });

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <FieldGroup>
        <TextareaField
          control={form.control}
          label={copy.content}
          name="content"
        />
      </FieldGroup>
      <div className="flex justify-end">
        <PendingButton
          idleLabel={copy.admin.submit}
          pending={pending}
          pendingLabel={copy.admin.saving}
          type="submit"
        />
      </div>
    </form>
  );
}
