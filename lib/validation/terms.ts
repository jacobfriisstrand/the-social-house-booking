import { z } from "zod";
import { TERMS_DOCUMENTS } from "@/lib/domain/terms";
import { messages } from "@/messages/da";

// One schema for the terms editor (admin, #15): the client resolver and the
// server action both parse with it. Saving publishes the text as a new
// version of the named document.

const { errors } = messages.terms.admin;

// A long legal text fits easily; the cap only stops a runaway paste.
const CONTENT_MAX = 100_000;

export const termsFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, errors.contentRequired)
    .max(CONTENT_MAX, errors.tooLong),
  name: z.enum(TERMS_DOCUMENTS),
});

export type TermsFormValues = z.infer<typeof termsFormSchema>;
