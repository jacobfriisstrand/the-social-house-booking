"use server";

// Booker verification (#2, ADR-0004): "Book nu" creates the hold and sends
// Mail 2, the code confirms the booking, "Send ny kode" issues a fresh one.
// The booking row is read and written under the company's session and RLS;
// only verification_codes goes through the service-role client (allowlist
// entry 1 in docs/agents/supabase.md), since the table is admin-only and
// the booker is not an auth user.
import { captureException } from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { requireOwnCompany } from "@/lib/auth/require-company";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { buildSnapshot } from "@/lib/domain/snapshot";
import { hoursBetween } from "@/lib/domain/time";
import {
  canResendCode,
  holdExpiry,
  VERIFICATION_TTL_MINUTES,
  type VerificationOutcome,
  verificationOutcome,
} from "@/lib/domain/verification";
import { sendMail } from "@/lib/email/send-mail";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateHoldValues,
  createHoldSchema,
  resendCodeSchema,
  type VerifyCodeValues,
  verifyCodeSchema,
} from "@/lib/validation/booking";
import {
  type FormError,
  type FormState,
  invalidFormState,
} from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { escapeHtml } from "@/supabase/functions/send-email/handler";
import {
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
} from "./verification-code";

const { errors } = messages.booking;

// What the verification step needs about a live hold; nothing else leaves
// the server.
export interface Hold {
  bookerEmail: string;
  bookingId: string;
  holdExpiresAt: string;
}

export type HoldState =
  | Exclude<FormState<CreateHoldValues>, { status: "success" }>
  | { hold: Hold; status: "held" };

export type VerifyCodeState = FormState<VerifyCodeValues>;

// Postgres exclusion_violation: the no-overlap constraint and the
// house-event triggers (#24) both raise it.
const EXCLUSION_VIOLATION = "23P01";

const errorState = (error: string) => ({ error, status: "error" as const });

type SessionClient = Awaited<ReturnType<typeof createClient>>;

interface LiveHold {
  bookerEmail: string;
  bookingId: string;
  bookingNumber: string;
}

// Either a value or the error state to return to the form.
type Step<T> = { ok: true; value: T } | { ok: false; state: FormError<never> };

const fail = (error: string): Step<never> => ({
  ok: false,
  state: errorState(error),
});

// Same gate as requireCompletedCompany(), but this flow needs the company
// row itself (discount, display name), so it goes through requireOwnCompany.
async function requireBookingCompany(): Promise<CompanyRow> {
  const { company } = await requireOwnCompany();
  if (!company.company_master_data_completed_at) {
    redirect("/company");
  }
  return company;
}

// The booking as the company may see it (RLS), only while the hold is
// live. A malformed id, another company's booking, a confirmed one, and a
// dead hold all read as "no hold".
async function findLiveHold(
  supabase: SessionClient,
  bookingId: unknown
): Promise<LiveHold | null> {
  const parsed = resendCodeSchema.safeParse({ bookingId });
  if (!parsed.success) {
    return null;
  }
  const { data } = await supabase
    .from("bookings")
    .select("booking_id, booking_number, booking_booker_email")
    .eq("booking_id", parsed.data.bookingId)
    .eq("booking_status", "pending_verification")
    .gt("booking_hold_expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) {
    return null;
  }
  return {
    bookerEmail: data.booking_booker_email,
    bookingId: data.booking_id,
    bookingNumber: data.booking_number,
  };
}

// Frees the room: the exclusion constraint and calendar_entries ignore
// expired rows (#24).
async function releaseHold(
  supabase: SessionClient,
  bookingId: string
): Promise<void> {
  await supabase
    .from("bookings")
    .update({ booking_status: "expired" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
}

// Stores a new hashed code and sends Mail 2 to the booker, greeting the
// company (Bilag 1 "Emails"). Throws on either failure.
async function issueCode(
  hold: LiveHold,
  company: CompanyRow,
  expiresAt: Date
): Promise<void> {
  const code = generateVerificationCode();
  const inserted = await createAdminClient()
    .from("verification_codes")
    .insert({
      verification_code_booking_id: hold.bookingId,
      verification_code_expires_at: expiresAt.toISOString(),
      verification_code_hash: hashVerificationCode(hold.bookingId, code),
    });
  if (inserted.error) {
    throw new Error(
      `verification code could not be stored: ${inserted.error.message}`
    );
  }
  await sendMail({
    bookingId: hold.bookingId,
    companyId: company.company_id,
    kind: "verification-code",
    to: hold.bookerEmail,
    variables: {
      CODE: code,
      COMPANY_DISPLAY_NAME: escapeHtml(company.company_display_name),
      VALID_MINUTES: VERIFICATION_TTL_MINUTES,
    },
  });
}

// issueCode with the failure reported to Sentry (booking_number and
// company_id only, docs/agents/stack.md) instead of thrown.
async function tryIssueCode(
  hold: LiveHold,
  company: CompanyRow,
  expiresAt: Date
): Promise<boolean> {
  try {
    await issueCode(hold, company, expiresAt);
    return true;
  } catch (error) {
    captureException(error, {
      tags: {
        booking_number: hold.bookingNumber,
        company_id: company.company_id,
      },
    });
    return false;
  }
}

const heldState = (hold: LiveHold, expiresAt: Date): HoldState => ({
  hold: {
    bookerEmail: hold.bookerEmail,
    bookingId: hold.bookingId,
    holdExpiresAt: expiresAt.toISOString(),
  },
  status: "held",
});

// An active room with room for the participants; the hourly price is what
// the snapshot needs.
async function findBookableRoom(
  supabase: SessionClient,
  input: CreateHoldValues
): Promise<Step<number>> {
  const room = await supabase
    .from("rooms")
    .select("room_capacity, room_is_active, room_price_ore")
    .eq("room_id", input.roomId)
    .maybeSingle();
  if (!room.data?.room_is_active) {
    return fail(errors.roomNotFound);
  }
  if (room.data.room_capacity < input.participantCount) {
    return {
      ok: false,
      state: {
        ...errorState(errors.roomCapacity),
        fieldErrors: { participantCount: [errors.roomCapacity] },
      },
    };
  }
  return { ok: true, value: room.data.room_price_ore };
}

// The pending_verification row with its price snapshot (ADR-0005; add-ons
// arrive with #7). The database rejects an overlapping slot, so no separate
// availability query runs first.
async function insertHold(
  supabase: SessionClient,
  company: CompanyRow,
  input: CreateHoldValues,
  roomHourlyPriceOre: number,
  expiresAt: Date
): Promise<Step<LiveHold>> {
  const snapshot = buildSnapshot({
    addOnsOre: 0,
    discountPercent: company.company_discount_percent,
    hours: hoursBetween(new Date(input.startAt), new Date(input.endAt)),
    roomHourlyPriceOre,
  });
  const inserted = await supabase
    .from("bookings")
    .insert({
      booking_booker_email: input.bookerEmail,
      booking_booker_name: input.bookerName,
      booking_booker_phone: input.bookerPhone,
      booking_company_id: company.company_id,
      booking_discount_percent: snapshot.discountPercent,
      booking_end_at: input.endAt,
      booking_expected_total_ore: snapshot.totalOre,
      booking_hold_expires_at: expiresAt.toISOString(),
      // Overwritten by the bookings_assign_number trigger (#24).
      booking_number: "",
      booking_participant_count: input.participantCount,
      booking_room_id: input.roomId,
      booking_room_price_ore: snapshot.roomHourlyPriceOre,
      booking_start_at: input.startAt,
      booking_status: "pending_verification",
    })
    .select("booking_id, booking_number")
    .single();
  if (inserted.error) {
    return fail(
      inserted.error.code === EXCLUSION_VIOLATION
        ? errors.slotTaken
        : errors.createFailed
    );
  }
  return {
    ok: true,
    value: {
      bookerEmail: input.bookerEmail,
      bookingId: inserted.data.booking_id,
      bookingNumber: inserted.data.booking_number,
    },
  };
}

// The first code for a fresh hold. No code, no way to confirm: a failed
// send frees the room instead of blocking it for ten minutes.
async function issueFirstCode(
  supabase: SessionClient,
  hold: LiveHold,
  company: CompanyRow,
  expiresAt: Date
): Promise<HoldState> {
  if (!(await tryIssueCode(hold, company, expiresAt))) {
    await releaseHold(supabase, hold.bookingId);
    return errorState(errors.mailFailed);
  }
  return heldState(hold, expiresAt);
}

// "Book nu": the hold, then the first code.
export async function createHold(
  _prevState: HoldState,
  values: CreateHoldValues
): Promise<HoldState> {
  const company = await requireBookingCompany();
  const parsed = createHoldSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, errors.createFailed);
  }
  const supabase = await createClient();
  const room = await findBookableRoom(supabase, parsed.data);
  if (!room.ok) {
    return room.state;
  }
  const expiresAt = holdExpiry(new Date());
  const hold = await insertHold(
    supabase,
    company,
    parsed.data,
    room.value,
    expiresAt
  );
  if (!hold.ok) {
    return hold.state;
  }
  return issueFirstCode(supabase, hold.value, company, expiresAt);
}

interface CodeRow {
  verification_code_attempts: number;
  verification_code_consumed_at: string | null;
  verification_code_expires_at: string;
  verification_code_hash: string;
  verification_code_id: string;
}

// A House Event added meanwhile makes the room-free trigger raise on the
// status change; the hold is then doomed, so release it.
async function confirmFailure(
  supabase: SessionClient,
  bookingId: string,
  code: string | undefined
): Promise<VerifyCodeState> {
  if (code === EXCLUSION_VIOLATION) {
    await releaseHold(supabase, bookingId);
    return errorState(errors.slotTaken);
  }
  return errorState(errors.holdExpired);
}

// Status → confirmed, only while the hold is still live; the room-free
// trigger re-runs on the status change (Bilag 1: availability is checked
// again before the booking is confirmed).
async function confirmBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<VerifyCodeState> {
  const confirmed = await supabase
    .from("bookings")
    .update({ booking_status: "confirmed" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification")
    .gt("booking_hold_expires_at", new Date().toISOString())
    .select("booking_id");
  if (confirmed.error) {
    return confirmFailure(supabase, bookingId, confirmed.error.code);
  }
  if (confirmed.data.length === 0) {
    return errorState(errors.holdExpired);
  }
  return { status: "success" };
}

interface OutcomeContext {
  bookingId: string;
  code: CodeRow;
  supabase: SessionClient;
}

type CodeUpdate = Database["public"]["Tables"]["verification_codes"]["Update"];

const codeUpdate = (code: CodeRow, patch: CodeUpdate) =>
  createAdminClient()
    .from("verification_codes")
    .update(patch)
    .eq("verification_code_id", code.verification_code_id);

const countAttempt = (code: CodeRow) =>
  codeUpdate(code, {
    verification_code_attempts: code.verification_code_attempts + 1,
  });

// One handler per outcome (lib/domain/verification.ts decides which).
const outcomeHandlers: {
  [K in VerificationOutcome["kind"]]: (
    outcome: Extract<VerificationOutcome, { kind: K }>,
    context: OutcomeContext
  ) => Promise<VerifyCodeState>;
} = {
  accepted: async (_outcome, { bookingId, code, supabase }) => {
    await codeUpdate(code, {
      verification_code_consumed_at: new Date().toISOString(),
    });
    return confirmBooking(supabase, bookingId);
  },
  consumed: () => Promise.resolve(errorState(errors.codeConsumed)),
  expired: () => Promise.resolve(errorState(errors.codeExpired)),
  locked: async (_outcome, { bookingId, code, supabase }) => {
    await countAttempt(code);
    await releaseHold(supabase, bookingId);
    return errorState(errors.codeLocked);
  },
  wrong: async (outcome, { code }) => {
    await countAttempt(code);
    return errorState(errors.codeWrong(outcome.attemptsLeft));
  },
};

const applyOutcome = (
  outcome: VerificationOutcome,
  context: OutcomeContext
): Promise<VerifyCodeState> => {
  // The map is keyed by kind, so the handler and the outcome agree; the
  // cast only tells TypeScript that.
  const handler = outcomeHandlers[outcome.kind] as (
    outcome: VerificationOutcome,
    context: OutcomeContext
  ) => Promise<VerifyCodeState>;
  return handler(outcome, context);
};

const latestCode = async (bookingId: string): Promise<CodeRow | null> => {
  const { data } = await createAdminClient()
    .from("verification_codes")
    .select(
      "verification_code_id, verification_code_hash, verification_code_attempts, verification_code_consumed_at, verification_code_expires_at"
    )
    .eq("verification_code_booking_id", bookingId)
    .order("verification_code_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

// "Bekræft booking": judges the latest code for the booking and applies the
// outcome. Only the company that holds the booking can reach this far; a
// wrong booking id reads as an expired hold, so the form never discloses
// other companies' bookings.
export async function verifyCode(
  _prevState: VerifyCodeState,
  values: VerifyCodeValues
): Promise<VerifyCodeState> {
  await requireBookingCompany();
  const parsed = verifyCodeSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, errors.verifyFailed);
  }
  const supabase = await createClient();
  const hold = await findLiveHold(supabase, parsed.data.bookingId);
  if (!hold) {
    return errorState(errors.holdExpired);
  }
  const code = await latestCode(hold.bookingId);
  if (!code) {
    return errorState(errors.verifyFailed);
  }
  const outcome = verificationOutcome({
    attempts: code.verification_code_attempts,
    consumedAt: code.verification_code_consumed_at,
    expiresAt: code.verification_code_expires_at,
    matches: verificationCodeMatches(
      hold.bookingId,
      parsed.data.code,
      code.verification_code_hash
    ),
    now: new Date(),
  });
  return applyOutcome(outcome, { bookingId: hold.bookingId, code, supabase });
}

const countIssuedCodes = async (bookingId: string): Promise<number> => {
  const { count } = await createAdminClient()
    .from("verification_codes")
    .select("verification_code_id", { count: "exact", head: true })
    .eq("verification_code_booking_id", bookingId);
  return count ?? 0;
};

const extendHold = async (
  supabase: SessionClient,
  bookingId: string,
  expiresAt: Date
): Promise<boolean> => {
  const { error } = await supabase
    .from("bookings")
    .update({ booking_hold_expires_at: expiresAt.toISOString() })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
  return error === null;
};

// A fresh code with a fresh window; the hold moves with it. A failed send
// leaves the hold: the previous code still works inside its own window.
async function reissueCode(
  supabase: SessionClient,
  hold: LiveHold,
  company: CompanyRow
): Promise<HoldState> {
  const expiresAt = holdExpiry(new Date());
  if (!(await extendHold(supabase, hold.bookingId, expiresAt))) {
    return errorState(errors.holdExpired);
  }
  if (!(await tryIssueCode(hold, company, expiresAt))) {
    return errorState(errors.mailFailed);
  }
  return heldState(hold, expiresAt);
}

// "Send ny kode". Capped so a booker cannot keep a room held indefinitely.
export async function resendCode(bookingId: string): Promise<HoldState> {
  const company = await requireBookingCompany();
  const supabase = await createClient();
  const hold = await findLiveHold(supabase, bookingId);
  if (!hold) {
    return errorState(errors.holdExpired);
  }
  if (!canResendCode(await countIssuedCodes(hold.bookingId))) {
    return errorState(errors.tooManyResends);
  }
  return reissueCode(supabase, hold, company);
}
