"use client";

// Statistik's month control (DESIGN.md "Statistik"): previous, the month,
// next. The month travels in the URL (?maaned=yyyy-mm) so a month can be
// shared. A new month loads as a transition: the old figures stay while
// data-pending marks the control, so the page can dim them (loading.tsx
// does not fire for a search-param change).
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { shiftMonth } from "@/lib/domain/statistics";
import { formatMonth } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics;

const monthHref = (month: string): string =>
  `/admin/statistics?maaned=${month}`;

export function MonthControl({ month }: { month: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const previous = useCallback(
    () => startTransition(() => router.push(monthHref(shiftMonth(month, -1)))),
    [month, router]
  );
  const next = useCallback(
    () => startTransition(() => router.push(monthHref(shiftMonth(month, 1)))),
    [month, router]
  );

  return (
    <div
      className="flex h-9 items-center rounded-md border bg-card"
      data-pending={pending ? "" : undefined}
    >
      <Button
        aria-label={copy.previousMonth}
        onClick={previous}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-32 px-1 text-center text-sm first-letter:uppercase">
        {formatMonth(month)}
      </span>
      <Button
        aria-label={copy.nextMonth}
        onClick={next}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
