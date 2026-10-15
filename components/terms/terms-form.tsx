"use client";

// Edit one text (admin, #15; DESIGN.md "Betingelser (admin)"): the current
// version's text in a Tiptap editor (#102); saving publishes it as the
// next version. One schema with the server action (lib/validation/terms.ts).
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  useForm,
} from "react-hook-form";
import { PendingButton } from "@/components/forms/pending-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { TermsRichTextEditor } from "@/components/terms/rich-text-editor";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { publishTermsVersion } from "@/lib/terms/actions";
import { type TermsFormValues, termsFormSchema } from "@/lib/validation/terms";
import { messages } from "@/messages/da";

const copy = messages.terms;

// Module level, so Controller gets a stable render reference (Biome
// noJsxPropsBind); the editor is uncontrolled after mount and pushes its
// HTML into the form on every update.
function ContentField({
  field,
  fieldState,
}: {
  field: ControllerRenderProps<TermsFormValues, "content">;
  fieldState: ControllerFieldState;
}) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="field-content">{copy.content}</FieldLabel>
      <TermsRichTextEditor
        content={field.value}
        invalid={fieldState.invalid}
        onChange={field.onChange}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

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
      <Controller control={form.control} name="content" render={ContentField} />
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
