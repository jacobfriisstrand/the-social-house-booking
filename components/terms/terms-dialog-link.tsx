"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { TermsVersion } from "@/lib/terms/data";
import { termsHtmlStyles } from "@/lib/terms/rich-text";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

// The signup consents open their policy in a dialog instead of navigating:
// the form keeps its state while the reader studies the text. The content
// is the editor's schema-generated HTML (#102); sanitizeTermsHtml keeps
// anything else out of the column, so rendering it as HTML is safe, and the
// styles match the editor's and the version page's. Unlinked while the text
// has no published version (the booking dialog rule); the schema still
// refuses the signup without the consent.
export function TermsDialogLink({
  children,
  version,
}: {
  children: string;
  version: TermsVersion | null;
}) {
  if (!version) {
    return children;
  }
  return (
    <Dialog>
      {/* type="button": inside the consent label, the trigger must never
          submit the signup form; cursor-pointer like the other buttons. */}
      <DialogTrigger
        render={
          <button
            className="cursor-pointer underline underline-offset-4"
            type="button"
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{messages.terms.documents[version.name]}</DialogTitle>
          <DialogDescription>
            {messages.terms.version(
              version.version,
              formatDate(version.publishedAt)
            )}
          </DialogDescription>
        </DialogHeader>
        {/* The body scrolls under the fixed header; max-h caps the popup so
            a long policy never runs past the viewport. */}
        <div className={cn("max-h-[60svh] overflow-y-auto", termsHtmlStyles)}>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the column keeps only what the terms schema generates (lib/terms/rich-text.ts), so the markup is the format, not untrusted input. */}
          <div dangerouslySetInnerHTML={{ __html: version.content }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
