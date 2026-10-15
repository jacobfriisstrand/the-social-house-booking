import { z } from "zod";
import { TERMS_DOCUMENTS } from "@/lib/domain/terms";
import { termsHtmlText } from "@/lib/terms/rich-text";
import { messages } from "@/messages/da";

// One schema for the terms editor (admin, #15): the client resolver and the
// server action both parse with it. Saving publishes the text as a new
// version of the named document. The content is the editor's schema-
// generated HTML (#102); the server additionally round trips it through
// the schema before storing (lib/terms/rich-text.ts).

const { errors } = messages.terms.admin;

// A long legal text fits easily; the cap only stops a runaway paste. It
// counts HTML now, so markup eats into it.
const CONTENT_MAX = 100_000;

export const termsFormSchema = z.object({
  content: z
    .string()
    .max(CONTENT_MAX, errors.tooLong)
    .refine(
      (content) => termsHtmlText(content).length > 0,
      errors.contentRequired
    ),
  name: z.enum(TERMS_DOCUMENTS),
});

export type TermsFormValues = z.infer<typeof termsFormSchema>;
