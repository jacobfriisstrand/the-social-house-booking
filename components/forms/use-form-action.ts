"use client";

// Wires a react-hook-form form to a Server Action through useActionState:
// pending state, a toast per result (DESIGN.md: every action result ends in
// a toast, and a toast never names a field), and server field errors back
// through the field API.
import { startTransition, useActionState, useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "@/components/ui/toast";
import { type FormState, idleFormState } from "@/lib/validation/form-state";
import { applyFieldErrors } from "./field-errors";

interface UseFormActionOptions<Values extends FieldValues> {
  action: (
    prevState: FormState<Values>,
    values: Values
  ) => Promise<FormState<Values>>;
  form: UseFormReturn<Values>;
  successMessage?: string;
}

export function useFormAction<Values extends FieldValues>({
  action,
  form,
  successMessage,
}: UseFormActionOptions<Values>) {
  const [state, formAction, pending] = useActionState<
    FormState<Values>,
    Values
  >(action, idleFormState);
  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );

  useEffect(() => {
    if (state.status === "success" && successMessage) {
      toast.add({ title: successMessage, type: "success" });
    }
  }, [state, successMessage]);

  useEffect(() => {
    if (state.status !== "error") {
      return;
    }
    toast.add({ title: state.error, type: "error" });
    applyFieldErrors(form, state.fieldErrors ?? {});
  }, [state, form]);

  return { pending, state, submit };
}
