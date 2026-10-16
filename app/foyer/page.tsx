import type { Metadata } from "next";
import { DayGrid } from "@/components/day-grid/day-grid";
import { FoyerRefresh } from "@/components/foyer/foyer-refresh";
import { NoticeStrip } from "@/components/notice-board/notice-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateString } from "@/lib/format";
import { loadFoyerDay } from "@/lib/foyer/data";
import { messages } from "@/messages/da";

const copy = messages.foyer;

export const metadata: Metadata = {
  title: copy.title,
};

// The foyer screen (#124): the notice board and today's booking overview
// for the always-on display by the entrance. Public by design — the reads
// run with the service role through lib/foyer/data.ts, which selects only
// what the screen shows. No booking affordances: the grid renders
// read-only, and the content re-renders itself every five minutes
// (FoyerRefresh), so nobody has to touch the screen. Force-dynamic: every
// render reads the clock and the day's rows.
export const dynamic = "force-dynamic";

export default async function FoyerPage() {
  const now = new Date();
  const { date, events, grid, notices, terms } = await loadFoyerDay(now);

  return (
    <div className="mx-auto flex min-h-dvh flex-col gap-6 p-6">
      <FoyerRefresh />
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-semibold text-2xl">{copy.title}</h1>
        <p className="text-muted-foreground">{formatDateString(date)}</p>
      </header>
      <NoticeStrip
        events={events}
        isAdmin={false}
        notices={notices}
        now={now}
      />
      <Card className="group/day shrink-0">
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{messages.home.dayTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <DayGrid
            columns={grid.columns}
            date={date}
            dateLabel={formatDateString(date)}
            entries={grid.entries}
            readOnly
            rows={grid.rows}
            terms={terms}
            viewer={{ discountPercent: 0, kind: "company" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
