import Image from "next/image";
import Link from "next/link";
import { messages } from "@/messages/da";

// Rendered when no route matches (node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md).
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Image
        alt="The Social House"
        className="group-data-[collapsible=icon]:hidden"
        height={30}
        priority
        src="/logo.svg"
        width={200}
      />
      <h1 className="font-semibold text-3xl">{messages.notFound.title}</h1>
      <p className="text-muted-foreground">{messages.notFound.description}</p>
      <Link
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/80"
        href="/"
      >
        {messages.notFound.backHome}
      </Link>
    </main>
  );
}
