import { z } from "zod";

// Result of a form Server Action, consumed by useActionState. A discriminated
// union so an error always carries its message (docs/agents/typescript.md).
// fieldErrors are keyed by the form's field names, first message per field.
export type FormState<Values> =
  | { status: "idle" }
  | { status: "success" }
  | {
      error: string;
      fieldErrors?: Partial<Record<keyof Values, string[]>>;
      status: "error";
    };

export const idleFormState = { status: "idle" } as const;

// The error state for a failed zod parse: one generic message for the toast,
// the schema's messages per field. Values is the form's value type; a
// stricter re-check (a subset of the fields) narrows to the same keys.
export const invalidFormState = <Values>(
  error: z.ZodError,
  message: string
): FormState<Values> => ({
  error: message,
  fieldErrors: z.flattenError(error).fieldErrors as Partial<
    Record<keyof Values, string[]>
  >,
  status: "error",
});
