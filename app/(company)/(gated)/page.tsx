import Link from "next/link";
import { NotAuthorizedAlert } from "@/components/not-authorized-alert";
import { messages } from "@/messages/da";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ unauthorized?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="p-8">
      <h1 className="font-semibold text-3xl">{messages.dashboard.title}</h1>
      {params.unauthorized ? <NotAuthorizedAlert /> : null}
      <nav className="mt-4">
        <Link className="underline-offset-4 hover:underline" href="/company">
          {messages.company.masterDataLink}
        </Link>
      </nav>
    </main>
  );
}
