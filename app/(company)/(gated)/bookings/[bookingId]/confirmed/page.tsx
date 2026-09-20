import { CircleCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth/require-session";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.booking.complete;

export const metadata: Metadata = {
  title: copy.title,
};

const bookingIdSchema = z.guid();

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The confirmed booking as the viewer may see it (RLS: the company's own,
// or any for an admin), with its room's name. A hold, a cancelled booking
// and another company's booking all read as not found.
async function loadConfirmedBooking(supabase: Supabase, bookingId: string) {
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "booking_number, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_expected_total_ore"
    )
    .eq("booking_id", bookingId)
    .eq("booking_status", "confirmed")
    .maybeSingle();
  if (!booking) {
    return null;
  }
  const { data: room } = await supabase
    .from("rooms")
    .select("room_name")
    .eq("room_id", booking.booking_room_id)
    .maybeSingle();
  return { ...booking, roomName: room?.room_name ?? "" };
}

function Detail({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? "font-mono" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

// Members go on to their bookings; an admin has no company and no member
// bookings page, so the next step is another booking. The buttons render
// links, so Base UI is told they are not native buttons.
function NextSteps({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <Button nativeButton={false} render={<Link href="/rooms" />}>
        {copy.bookAnother}
      </Button>
    );
  }
  return (
    <>
      <Button
        nativeButton={false}
        render={<Link href="/rooms" />}
        variant="outline"
      >
        {copy.bookAnother}
      </Button>
      <Button nativeButton={false} render={<Link href="/bookings" />}>
        {copy.toBookings}
      </Button>
    </>
  );
}

// Booking complete (#4): where the booking dialog lands after the code is
// accepted, and after an admin books for a company.
export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const parsed = bookingIdSchema.safeParse((await params).bookingId);
  if (!parsed.success) {
    notFound();
  }
  const session = await requireSession();
  const booking = await loadConfirmedBooking(await createClient(), parsed.data);
  if (!booking) {
    notFound();
  }

  return (
    <>
      <PageHeader title={copy.title} />
      <PagePanel>
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleCheckIcon aria-hidden="true" className="text-success" />
              {copy.heading}
            </CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              <Detail
                label={copy.bookingNumber}
                mono
                value={booking.booking_number}
              />
              <Detail label={copy.room} value={booking.roomName} />
              <Detail
                label={copy.date}
                value={formatDate(booking.booking_start_at)}
              />
              <Detail
                label={copy.time}
                value={`${formatTime(booking.booking_start_at)} - ${formatTime(booking.booking_end_at)}`}
              />
              <Detail
                label={copy.participants}
                value={`${booking.booking_participant_count} ${messages.rooms.persons}`}
              />
              <Detail label={copy.booker} value={booking.booking_booker_name} />
              <Detail
                label={copy.total}
                value={`${formatOre(booking.booking_expected_total_ore)} ${messages.format.exclVat}`}
              />
            </dl>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <NextSteps isAdmin={session.appRole === "admin"} />
          </CardFooter>
        </Card>
      </PagePanel>
    </>
  );
}
