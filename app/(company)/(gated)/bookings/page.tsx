import { PageHeader, PagePanel } from "@/components/shell/page";
import { messages } from "@/messages/da";

// Bookinger (member): the booking overview from #9 renders on the panel.
// The shell (#55) owns the sidebar, the title, the panel and the footer.
export default function CompanyBookingsPage() {
  return (
    <>
      <PageHeader title={messages.shell.bookings} />
      <PagePanel />
    </>
  );
}
