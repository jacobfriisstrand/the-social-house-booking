import { NotAuthorizedAlert } from "@/components/not-authorized-alert";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { messages } from "@/messages/da";

// Hjem: the day grid from #12 renders on the panel. The shell (#55) owns
// the sidebar, the title, the panel and the footer line.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ unauthorized?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params.unauthorized ? <NotAuthorizedAlert /> : null}
      <PageHeader title={messages.shell.home} />
      <PagePanel />
    </>
  );
}
