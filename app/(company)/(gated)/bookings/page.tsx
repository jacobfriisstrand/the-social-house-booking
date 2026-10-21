import type { Metadata } from "next";
import { BookingOverview } from "@/components/bookings/member-bookings-view";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { listOwnBookingOverview } from "@/lib/bookings/data";
import { parseMemberViewParams } from "@/lib/bookings/member-view-params";
import { listRoomOptions } from "@/lib/bookings/room-options";
import { first, type SearchParams } from "@/lib/bookings/view-params";
import { filterBookingOverview } from "@/lib/domain/booking-overview";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.shell.bookings,
};

// Bookinger (member, #8): only the company's own rows are loaded, under
// the admin overview's filter row and sorting (DESIGN.md "Bookinger
// (member)"); the filters and the sort travel in the URL under the admin
// page's keys (lib/bookings/member-view-params.ts). The member guard also
// prevents an admin session from reaching the admin branch of RLS.
// `?booking=<id>` (the link in Mail 4, 5 and 6, #88) opens that booking's
// sheet when it is one of the listed rows.
export default async function CompanyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ company }, rawParams] = await Promise.all([
    requireOwnCompany(),
    searchParams,
  ]);
  const params = parseMemberViewParams(rawParams);
  const supabase = await createClient();
  const [bookings, rooms] = await Promise.all([
    listOwnBookingOverview(supabase, company.company_id),
    listRoomOptions(supabase),
  ]);
  const listed = filterBookingOverview(bookings, params, new Date());

  return (
    <>
      <PageHeader title={messages.shell.bookings} />
      <PagePanel>
        <BookingOverview
          bookings={listed}
          initialBookingId={first(rawParams.booking)}
          params={params}
          rooms={rooms}
        />
      </PagePanel>
    </>
  );
}
