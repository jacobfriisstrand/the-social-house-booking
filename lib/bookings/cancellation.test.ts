import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CancellationBooking,
  type CancellationClient,
  confirmCancellation,
} from "./cancellation";

// Pins #110: a failed or skipped cancellation mail never rolls the
// cancellation back, and Sentry gets the error keyed on booking number and
// company id only. That the failed send is logged in outbound_emails is
// sendMail's own rule, pinned in lib/email/send-mail.test.ts.
const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  env: { ADMIN_NOTIFY_EMAIL: "admin@example.com" as string | undefined },
  sendMail: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/email/send-mail", () => ({ sendMail: mocks.sendMail }));

// 45 hours before the start: the 50 % tier of the 625 kr. room rental.
const NOW = new Date("2026-10-21T12:00:00+02:00");
const FEE_ORE = 31_250;
const SENTRY_TAGS = {
  tags: { booking_number: "B-2610-0001", company_id: "c1" },
};

const booking: CancellationBooking = {
  booking_addon_total_ore: 0,
  booking_booker_email: "booker@rituals.dk",
  booking_booker_name: "Bo Booker",
  booking_cancellation_fee_waived: false,
  booking_company_id: "c1",
  booking_discount_percent: 0,
  booking_end_at: "2026-10-23T11:00:00+02:00",
  booking_expected_total_ore: 62_500,
  booking_id: "b1",
  booking_number: "B-2610-0001",
  booking_room_price_ore: 62_500,
  booking_start_at: "2026-10-23T09:00:00+02:00",
  booking_status: "confirmed",
  companies: { company_display_name: "Rituals" },
  rooms: { room_name: "Lokalet" },
};

// One bookings row: the load reads it and the guarded update writes to it,
// in the call order confirmCancellation uses.
const fakeBookings = () => {
  const row: Record<string, unknown> = { ...booking };
  const cancelled = { data: [{ booking_id: booking.booking_id }], error: null };
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: booking }) }),
      }),
      update: (values: Record<string, unknown>) => {
        Object.assign(row, values);
        return {
          eq: () => ({
            eq: () => ({ gt: () => ({ select: async () => cancelled }) }),
          }),
        };
      },
    }),
  };
  return { client: client as unknown as CancellationClient, row };
};

const sentKinds = () => mocks.sendMail.mock.calls.map(([input]) => input.kind);

describe("confirmCancellation when the mails fail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    mocks.env.ADMIN_NOTIFY_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the cancellation and its fee when both sends fail, reporting each failure", async () => {
    const failure = new Error("Resend responded 500");
    mocks.sendMail.mockRejectedValue(failure);
    const { client, row } = fakeBookings();

    const outcome = await confirmCancellation(client, "b1", "member");

    expect(outcome).toEqual({ feeOre: FEE_ORE, ok: true });
    expect(row).toMatchObject({
      booking_cancellation_fee_ore: FEE_ORE,
      booking_status: "cancelled",
    });
    expect(sentKinds()).toEqual([
      "booking-cancelled",
      "admin-booking-cancelled",
    ]);
    expect(mocks.captureException.mock.calls).toEqual([
      [failure, SENTRY_TAGS],
      [failure, SENTRY_TAGS],
    ]);
  });

  it("keeps the cancellation and still sends Mail 7 when ADMIN_NOTIFY_EMAIL is unset", async () => {
    mocks.env.ADMIN_NOTIFY_EMAIL = undefined;
    mocks.sendMail.mockResolvedValue(undefined);
    const { client, row } = fakeBookings();

    const outcome = await confirmCancellation(client, "b1", "admin");

    expect(outcome).toEqual({ feeOre: FEE_ORE, ok: true });
    expect(row).toMatchObject({ booking_status: "cancelled" });
    expect(sentKinds()).toEqual(["booking-cancelled"]);
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    expect(mocks.captureException).toHaveBeenCalledWith(
      new Error("ADMIN_NOTIFY_EMAIL is not set; Mail 9 was not sent"),
      SENTRY_TAGS
    );
  });
});
