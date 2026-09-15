import Link from "next/link";
import { NotAuthorizedAlert } from "@/components/not-authorized-alert";
import { messages } from "@/messages/da";

// Dashboard placeholder: content only. Layout, page title, and the muted
// panel belong to the app shell (#55).
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ unauthorized?: string }>;
}) {
  const params = await searchParams;

  return (
    <main>
      {params.unauthorized ? <NotAuthorizedAlert /> : null}
      <nav>
        <Link className="underline-offset-4 hover:underline" href="/company">
          {messages.company.masterDataLink}
        </Link>
      </nav>
    </main>
  );
}
