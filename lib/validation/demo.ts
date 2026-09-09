import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the demo form: client resolver and the server action both parse with it.
export const demoFormSchema = z.object({
  email: z.email(messages.demo.errors.emailInvalid),
  message: z
    .string()
    .trim()
    .max(500, messages.demo.errors.messageMax)
    .optional(),
  name: z.string().trim().min(2, messages.demo.errors.nameMin),
});

export type DemoFormValues = z.infer<typeof demoFormSchema>;
