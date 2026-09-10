import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

export default function AdminHomePage() {
  return (
    <main className="p-8">
      <h1 className="font-semibold text-3xl">{messages.admin.homeTitle}</h1>
      <nav className="mt-4">
        <Link
          className="underline-offset-4 hover:underline"
          href="/admin/companies"
        >
          {messages.admin.companiesLink}
        </Link>
      </nav>
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="outline">
          {messages.common.signOut}
        </Button>
      </form>
    </main>
  );
}
