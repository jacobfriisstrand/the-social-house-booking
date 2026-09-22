// Login form schema, shared by the client form and the server action
// (docs/agents/ui.md: the action re-parses on the server, always).
import { z } from "zod";
import { messages } from "@/messages/da";

export const loginSchema = z.object({
  email: z.email(messages.login.invalidEmail),
  password: z.string().min(1, messages.login.missingPassword),
});

export const forgotPasswordSchema = z.object({
  email: z.email(messages.login.invalidEmail),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// Set-password form (#1): the invite or recovery link carries token_hash and
// type; the page passes them through as hidden values. Same page serves
// `recovery` when #11 lands, so the type is not hard-coded to `invite`.
const PASSWORD_MIN = 8;

export const setPasswordLinkSchema = z.union([
  z.object({
    tokenHash: z.string().min(1),
    type: z.enum(["invite", "recovery"]),
  }),
  z.object({
    code: z.string().min(1),
    type: z.literal("recovery"),
  }),
]);

export const setPasswordSchema = z
  .object({
    code: z.string().min(1).optional(),
    password: z
      .string()
      .min(PASSWORD_MIN, messages.setPassword.errors.passwordMin),
    passwordConfirm: z.string(),
    tokenHash: z.string().min(1).optional(),
    type: z.enum(["invite", "recovery"]),
  })
  .superRefine((values, context) => {
    if (!(values.code || values.tokenHash)) {
      context.addIssue({
        code: "custom",
        message: messages.setPassword.errors.linkInvalid,
        path: ["tokenHash"],
      });
    }
    if (values.code && values.type !== "recovery") {
      context.addIssue({
        code: "custom",
        message: messages.setPassword.errors.linkInvalid,
        path: ["code"],
      });
    }
    if (values.password !== values.passwordConfirm) {
      context.addIssue({
        code: "custom",
        message: messages.setPassword.errors.mismatch,
        path: ["passwordConfirm"],
      });
    }
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
export type SetPasswordLinkValues = z.infer<typeof setPasswordLinkSchema>;
