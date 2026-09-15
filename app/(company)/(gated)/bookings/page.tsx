import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

// Placeholder page: content only. Layout, page title, and the muted panel
// belong to the app shell (#55).
export default function CompanyBookingsPage() {
  return (
    <main>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {messages.common.signOut}
        </Button>
      </form>
    </main>
  );
}
