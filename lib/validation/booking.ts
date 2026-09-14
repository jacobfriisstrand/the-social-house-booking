// Booking schemas (#2), shared by the client forms and the server actions;
// the action re-parses on the server, always (docs/agents/ui.md). Times are
// ISO strings with an explicit offset (ADR-0021); #4's dialog adds the
// 30-minute grid, opening hours and the 12-month horizon on top.
import { z } from "zod";
import { VERIFICATION_CODE_LENGTH } from "@/lib/domain/verification";
import { messages } from "@/messages/da";

const { errors } = messages.booking;
const SHORT_MAX = 200;
const SIX_DIGITS = new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`);

const required = z
  .string()
  .trim()
  .min(1, errors.required)
  .max(SHORT_MAX, errors.tooLong);
// Postgres ids from seeds and fixtures are not RFC 4122, so guid, not uuid.
const instant = z.iso.datetime({ offset: true });

// The responsible booker (Bilag 1 "The specific booker"): the person, not
// the company account.
export const bookerFields = {
  bookerEmail: z.email(errors.emailInvalid),
  bookerName: required,
  bookerPhone: required,
};

// Room, period and headcount: what any booking needs besides the booker.
const slotFields = {
  endAt: instant,
  participantCount: z
    .number(errors.participantsInvalid)
    .int(errors.participantsInvalid)
    .min(1, errors.participantsInvalid),
  roomId: z.guid(),
  startAt: instant,
};

const endAfterStart = (values: { endAt: string; startAt: string }) =>
  new Date(values.endAt) > new Date(values.startAt);
const endAfterStartError = { message: errors.endBeforeStart, path: ["endAt"] };

export const createHoldSchema = z
  .object({ ...bookerFields, ...slotFields })
  .refine(endAfterStart, endAfterStartError);

export type CreateHoldValues = z.infer<typeof createHoldSchema>;

// Admin books on a company's behalf (#14, ADR-0023): the same booking, plus
// which company, and confirmed at once without a verification code.
export const adminBookingSchema = z
  .object({ ...bookerFields, ...slotFields, companyId: z.guid() })
  .refine(endAfterStart, endAfterStartError);

export type AdminBookingValues = z.infer<typeof adminBookingSchema>;

export const verifyCodeSchema = z.object({
  bookingId: z.guid(),
  code: z.string().trim().regex(SIX_DIGITS, errors.codeFormat),
});

export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>;

// A booking id on its own: "Send ny kode" and the live-hold lookup.
export const bookingIdSchema = z.object({
  bookingId: z.guid(),
});
