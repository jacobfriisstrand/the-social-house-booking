// The notice board's first section (DESIGN.md "Hjem" 1): one card per
// notice that is shown and per House Event today. House Event cards carry
// the info badge. Admins get a ghost edit link to Opslag; members do not.
// Hidden entirely when there is nothing to show.
import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTime } from "@/lib/format";
import type { StripHouseEvent } from "@/lib/notice-board/data";
import type { Notice } from "@/lib/notices/data";
import { messages } from "@/messages/da";

const copy = messages.home;

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle>{notice.title}</CardTitle>
      </CardHeader>
      <CardContent className="whitespace-pre-line text-muted-foreground text-sm">
        {notice.body}
      </CardContent>
    </Card>
  );
}

function HouseEventCard({ event }: { event: StripHouseEvent }) {
  const time = `${formatTime(event.startAt)} - ${formatTime(event.endAt)}`;
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {event.title ?? copy.houseEventBadge}
          <Badge variant="info">{copy.houseEventBadge}</Badge>
        </CardTitle>
        <CardDescription className="tabular-nums">
          {copy.houseEventWhen(event.roomNames.join(", "), time)}
        </CardDescription>
      </CardHeader>
      {event.description ? (
        <CardContent className="text-muted-foreground text-sm">
          {event.description}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function NoticeStrip({
  events,
  isAdmin,
  notices,
}: {
  events: StripHouseEvent[];
  isAdmin: boolean;
  notices: Notice[];
}) {
  if (notices.length === 0 && events.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="notice-strip-title"
      className="flex flex-col gap-3"
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2 className="font-medium text-lg" id="notice-strip-title">
          {copy.noticesTitle}
        </h2>
        {isAdmin ? (
          <Button
            nativeButton={false}
            render={<Link href="/admin/notices" />}
            variant="ghost"
          >
            <PencilIcon data-icon="inline-start" />
            {copy.editNotices}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notices.map((notice) => (
          <NoticeCard key={notice.noticeId} notice={notice} />
        ))}
        {events.map((event) => (
          <HouseEventCard event={event} key={event.id} />
        ))}
      </div>
    </section>
  );
}
