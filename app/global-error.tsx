"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages/da";
import "./globals.css";

// Replaces the root layout when rendering fails, so it carries its own <html>
// and <body> (node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="da">
      <body className="antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-semibold text-3xl">{messages.error.title}</h1>
          <p className="text-muted-foreground">{messages.error.description}</p>
          <Button onClick={retry}>{messages.error.retry}</Button>
        </main>
      </body>
    </html>
  );
}
