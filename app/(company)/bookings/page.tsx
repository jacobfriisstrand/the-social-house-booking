import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

export default function CompanyBookingsPage() {
  return (
    <main className="p-8">
      <h1 className="font-semibold text-3xl">
        {messages.company.bookingsTitle}
      </h1>
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="outline">
          {messages.common.signOut}
        </Button>
      </form>
    </main>
  );
}
