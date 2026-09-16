// Login form schema, shared by the client form and the server action
// (docs/agents/ui.md: the action re-parses on the server, always).
import { z } from "zod";
import { messages } from "@/messages/da";

export const loginSchema = z.object({
  email: z.email(messages.login.invalidEmail),
  password: z.string().min(1, messages.login.missingPassword),
});

export type LoginValues = z.infer<typeof loginSchema>;

// Set-password form (#1): the invite or recovery link carries token_hash and
// type; the page passes them through as hidden values. Same page serves
// `recovery` when #11 lands, so the type is not hard-coded to `invite`.
const PASSWORD_MIN = 8;

export const setPasswordLinkSchema = z.object({
  tokenHash: z.string().min(1),
  type: z.enum(["invite", "recovery"]),
});

export const setPasswordSchema = setPasswordLinkSchema
  .extend({
    password: z
      .string()
      .min(PASSWORD_MIN, messages.setPassword.errors.passwordMin),
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: messages.setPassword.errors.mismatch,
    path: ["passwordConfirm"],
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
