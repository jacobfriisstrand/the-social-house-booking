// Login form schema, shared by the client form and the server action
// (docs/agents/ui.md: the action re-parses on the server, always).
import { z } from "zod";
import { masterDataSchema } from "@/lib/validation/company";
import { messages } from "@/messages/da";

export const loginSchema = z.object({
  email: z.email(messages.login.invalidEmail),
  // Where to go after login (#88); the action keeps it only when it is a
  // path on this site (lib/auth/next-path.ts).
  next: z.string().optional(),
  password: z.string().min(1, messages.login.missingPassword),
});

export const forgotPasswordSchema = z.object({
  email: z.email(messages.login.invalidEmail),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// Set-password link (#1): the invite or recovery link carries token_hash and
// type; the page passes them through as hidden values. A resent invitation
// for a company whose first link is burnt arrives as a magiclink token (Auth
// refuses a second invite once the email is confirmed) and gets the same
// one-page form. Local Auth uses PKCE and arrives with ?code= instead; that
// path keeps the recovery treatment (docs/agents/auth.md). Every member
// carries a literal type so the page can narrow the union and hand each form
// exactly its own link shape.
const PASSWORD_MIN = 8;

export const setPasswordLinkSchema = z.union([
  z.object({
    tokenHash: z.string().min(1),
    type: z.literal("invite"),
  }),
  z.object({
    tokenHash: z.string().min(1),
    type: z.literal("magiclink"),
  }),
  z.object({
    tokenHash: z.string().min(1),
    type: z.literal("recovery"),
  }),
  z.object({
    code: z.string().min(1),
    type: z.literal("recovery"),
  }),
]);

// The password/confirm pair and its match check: the recovery form, the
// invitation acceptance and the change-password form all repeat them, so
// they live here once (A recovery form (#11) and change-password (#125)
// share the strength and confirm rules).
const passwordShape = {
  password: z
    .string()
    .min(PASSWORD_MIN, messages.setPassword.errors.passwordMin),
  passwordConfirm: z.string(),
};

const refinePasswordMatch = (
  values: { password: string; passwordConfirm: string },
  context: z.RefinementCtx
): void => {
  if (values.password !== values.passwordConfirm) {
    context.addIssue({
      code: "custom",
      message: messages.setPassword.errors.mismatch,
      path: ["passwordConfirm"],
    });
  }
};

// Recovery form (#11): the signed-out user picks a new password on the
// session the link starts. The invite case has its own form and action
// (acceptInvitationSchema) so onboarding never routes through the login page.
export const setPasswordSchema = z
  .object({
    code: z.string().min(1).optional(),
    ...passwordShape,
    tokenHash: z.string().min(1).optional(),
    type: z.literal("recovery"),
  })
  .superRefine((values, context) => {
    if (!(values.code || values.tokenHash)) {
      context.addIssue({
        code: "custom",
        message: messages.setPassword.errors.linkInvalid,
        path: ["tokenHash"],
      });
    }
    refinePasswordMatch(values, context);
  });

// Invitation acceptance (#1): one submit sets the shared password and fills
// the company's master data, then the company lands logged in. The invited
// address is the login, so the form carries no email; the action injects it
// from the company row and the save commits at once (no approval round).
// tokenType mirrors the link (invite, or magiclink for a resent invitation)
// so verifyOtp consumes the token under the type it was minted with.
// The two consents are separate boxes on purpose: privacy consent stays
// unbundleable from the trade terms (same pattern as the booking dialog's
// termsFields in lib/validation/booking.ts).
export const acceptInvitationSchema = z
  .object({
    ...passwordShape,
    privacyAccepted: z
      .boolean()
      .refine(
        (accepted) => accepted,
        messages.setPassword.errors.privacyRequired
      ),
    termsAccepted: z
      .boolean()
      .refine(
        (accepted) => accepted,
        messages.setPassword.errors.termsRequired
      ),
    tokenHash: z.string().min(1),
    tokenType: z.enum(["invite", "magiclink"]),
    ...masterDataSchema.shape,
  })
  .superRefine(refinePasswordMatch);

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>;
export type SetPasswordLinkValues = z.infer<typeof setPasswordLinkSchema>;
// The link member the password-only form serves; the invite member goes to
// the invitation form instead.
export type SetPasswordRecoveryLinkValues = Extract<
  SetPasswordLinkValues,
  { type: "recovery" }
>;

// Change-password form (#125): the signed-in admin changes their own
// password on the active session — Supabase's default authorization, no
// current-password re-entry. Same strength and confirm rules as set-password.
export const changePasswordSchema = z
  .object({ ...passwordShape })
  .superRefine(refinePasswordMatch);

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
