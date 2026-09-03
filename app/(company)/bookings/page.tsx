import { signOut } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

export default function CompanyBookingsPage() {
  return (
    <main className="p-8">
      <h1 className="font-semibold text-3xl">
        {messages.company.bookingsTitle}
      </h1>
      <form action={signOut} className="mt-4">
        <button
          className="h-9 rounded-lg border border-border px-4 text-sm"
          type="submit"
        >
          {messages.common.signOut}
        </button>
      </form>
    </main>
  );
}
