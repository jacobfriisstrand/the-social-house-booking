// Login form schema, shared by the client form and the server action
// (docs/agents/ui.md: the action re-parses on the server, always).
import { z } from "zod";
import { messages } from "@/messages/da";

export const loginSchema = z.object({
  email: z.email(messages.login.invalidEmail),
  password: z.string().min(1, messages.login.missingPassword),
});
