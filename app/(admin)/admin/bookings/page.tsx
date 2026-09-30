import { AdminBookingsTable } from "@/components/bookings/admin-bookings-table";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { listOutstandingInvoices } from "@/lib/bookings/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// Bookinger (admin) — the invoicing view's minimal version (2026-09-29):
// ended bookings without an invoice, the worklist the sidebar badge
// counts. Filters, the totals row and the bulk "Markér som faktureret"
// action follow with the full view (DESIGN.md "Bookinger (admin)"); the
// layout guards the route (app_role = 'admin', docs/agents/auth.md).
export default async function AdminBookingsPage() {
  const supabase = await createClient();
  const rows = await listOutstandingInvoices(supabase);

  return (
    <>
      <PageHeader title={messages.shell.bookings} />
      <PagePanel>
        <AdminBookingsTable rows={rows} />
      </PagePanel>
    </>
  );
}
