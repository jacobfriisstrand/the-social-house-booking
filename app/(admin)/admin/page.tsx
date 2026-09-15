import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

// Placeholder home: content only. Layout, page title, and the muted panel
// belong to the app shell (#55).
export default function AdminHomePage() {
  return (
    <main>
      <Button
        nativeButton={false}
        render={<Link href="/admin/rooms" />}
        variant="outline"
      >
        {messages.rooms.listTitle}
      </Button>
      <nav>
        <Link
          className="underline-offset-4 hover:underline"
          href="/admin/companies"
        >
          {messages.admin.companiesLink}
        </Link>
      </nav>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {messages.common.signOut}
        </Button>
      </form>
    </main>
  );
}
