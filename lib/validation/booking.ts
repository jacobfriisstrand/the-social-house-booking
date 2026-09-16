// Booking schemas (#2, #4), shared by the client forms and the server
// actions; the action re-parses on the server, always (docs/agents/ui.md).
// Times are ISO strings with an explicit offset (ADR-0021). The booking
// window (30-minute grid, minimum length, future start, 12-month horizon)
// is lib/domain/booking-window.ts; opening hours and collisions are checked
// in the action against the room's rows and the database.
import { z } from "zod";
import {
  type BookingWindowOutcome,
  bookingWindowOutcome,
} from "@/lib/domain/booking-window";
import { VERIFICATION_CODE_LENGTH } from "@/lib/domain/verification";
import { messages } from "@/messages/da";

const { errors } = messages.booking;
const SHORT_MAX = 200;
const ADDONS_MAX = 20;
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

// Room, period, headcount, add-ons and the terms: what any booking needs
// besides the booker.
export const bookingFields = {
  ...bookerFields,
  addonIds: z.array(z.guid()).max(ADDONS_MAX),
  endAt: instant,
  participantCount: z
    .number(errors.participantsInvalid)
    .int(errors.participantsInvalid)
    .min(1, errors.participantsInvalid),
  roomId: z.guid(),
  startAt: instant,
  termsAccepted: z
    .boolean()
    .refine((accepted) => accepted, errors.termsRequired),
};

const windowErrors: Record<
  Exclude<BookingWindowOutcome["kind"], "ok">,
  { message: string; path: "endAt" | "startAt" }
> = {
  beyond_horizon: { message: errors.beyondHorizon, path: "endAt" },
  in_past: { message: errors.inPast, path: "startAt" },
  off_grid: { message: errors.offGrid, path: "startAt" },
  too_short: { message: errors.tooShort, path: "endAt" },
};

const bookingWindowRule = (
  values: { endAt: string; startAt: string },
  ctx: z.RefinementCtx
): void => {
  const outcome = bookingWindowOutcome({
    endAt: new Date(values.endAt),
    now: new Date(),
    startAt: new Date(values.startAt),
  });
  if (outcome.kind === "ok") {
    return;
  }
  const rule = windowErrors[outcome.kind];
  ctx.addIssue({ code: "custom", message: rule.message, path: [rule.path] });
};

export const createHoldSchema = z
  .object(bookingFields)
  .superRefine(bookingWindowRule);

export type CreateHoldValues = z.infer<typeof createHoldSchema>;

// The dialog's form for a company: the same fields, with the company id
// carried along empty so one form type serves both viewers.
export const bookingFormSchema = z
  .object({ ...bookingFields, companyId: z.string() })
  .superRefine(bookingWindowRule);

// Admin books on a company's behalf (#14, ADR-0023): the same booking, plus
// which company, and confirmed at once without a verification code.
export const adminBookingSchema = z
  .object({ ...bookingFields, companyId: z.guid(errors.required) })
  .superRefine(bookingWindowRule);

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
