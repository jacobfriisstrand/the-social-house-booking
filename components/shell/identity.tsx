// The signed-in chip (DESIGN.md, "Shell"): who the viewer is logged in as,
// at the very far right of the page header row — past every page action.
// The user icon marks what the line means, and the email names the shared
// account; the email drops on phone. A server component: the identity
// rides the page render, deduplicated with the layout's reads through
// lib/auth/identity's per-request cache.
import { UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getSignedInIdentity } from "@/lib/auth/identity";
import { messages } from "@/messages/da";

export async function SignedInAs() {
  const identity = await getSignedInIdentity();
  return (
    <p className="flex min-w-0 max-w-full items-center gap-2 text-sm">
      <span className="sr-only">{messages.shell.signedInAs}</span>
      <UserIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span
        className="truncate font-medium text-foreground"
        title={identity.displayName}
      >
        {identity.displayName}
      </span>
      <Separator
        className="my-auto hidden h-3.5 md:block"
        orientation="vertical"
      />
      <span
        className="hidden truncate text-muted-foreground md:inline"
        title={identity.email}
      >
        {identity.email}
      </span>
    </p>
  );
}
