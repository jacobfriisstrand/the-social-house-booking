// Applies server-side field errors through the react-hook-form field API:
// the first message per field, since the form never lists more than the
// schema produced (docs/agents/ui.md).
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

export const applyFieldErrors = <Values extends FieldValues>(
  form: UseFormReturn<Values>,
  fieldErrors: Partial<Record<keyof Values, string[]>>
): void => {
  for (const [key, errs] of Object.entries(fieldErrors)) {
    if (errs?.length) {
      form.setError(key as Path<Values>, { message: errs[0] });
    }
  }
};
