"use server";

import { z } from "zod";
import { type DemoFormValues, demoFormSchema } from "@/lib/validation/demo";

export type DemoFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      fieldErrors?: Partial<Record<keyof DemoFormValues, string[]>>;
    };

export async function submitDemoForm(
  _previousState: DemoFormState,
  values: DemoFormValues
): Promise<DemoFormState> {
  // The action re-parses with the same schema, always (docs/agents/ui.md).
  const parsed = demoFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      status: "error",
    };
  }

  // Baseline demo: nothing to persist yet. The delay makes the pending state visible.
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 600);
  await promise;

  return { status: "success" };
}
