import { BookingOverview } from "@/components/bookings/booking-overview";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { listOwnBookingOverview } from "@/lib/bookings/data";
import { splitBookingOverview } from "@/lib/domain/booking-overview";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// Bookinger (member, #8): only the company's own rows are loaded. The member
// guard also prevents an admin session from reaching the admin branch of RLS.
export default async function CompanyBookingsPage() {
  const { company } = await requireOwnCompany();
  const supabase = await createClient();
  const bookings = await listOwnBookingOverview(supabase, company.company_id);
  const lists = splitBookingOverview(bookings, new Date());

  return (
    <>
      <PageHeader title={messages.shell.bookings} />
      <PagePanel>
        <BookingOverview bookings={lists} />
      </PagePanel>
    </>
  );
}
