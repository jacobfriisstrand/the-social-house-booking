import { MapPinIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookRoom } from "@/components/bookings/book-room";
import { formatAddonPrice } from "@/components/rooms/addon-price";
import { PriceRow } from "@/components/rooms/price-row";
import { RoomPhotoCarousel } from "@/components/rooms/room-photo-carousel";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth/require-session";
import { listRoomDayPeriods } from "@/lib/bookings/availability";
import { getBookingViewer, viewerDiscount } from "@/lib/bookings/viewer";
import { cphDate } from "@/lib/domain/opening-hours";
import { formatKroner } from "@/lib/format";
import { findPublicRoom, type PublicRoom } from "@/lib/rooms/public-data";
import { createClient } from "@/lib/supabase/server";
import {
  parseRoomPrefill,
  parseRoomSearch,
  roomSearchQuery,
} from "@/lib/validation/room-search";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.rooms.listTitle,
};

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="rounded-full bg-secondary/40" variant="outline">
      {children}
    </Badge>
  );
}

function RoomChips({ room }: { room: PublicRoom }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip>
        <UsersIcon aria-hidden="true" />
        {messages.rooms.capacityChip(room.capacity)}
      </Chip>
      {room.location ? (
        <Chip>
          <MapPinIcon aria-hidden="true" />
          {room.location}
        </Chip>
      ) : null}
      <Chip>
        {formatKroner(room.hourlyPriceOre)}
        {messages.rooms.perHourSuffix}
      </Chip>
    </div>
  );
}

function AddonList({ room }: { room: PublicRoom }) {
  if (room.addons.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {messages.booking.dialog.addonsEmpty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {room.addons.map((addon) => (
        <li
          className="flex items-center justify-between gap-4 text-sm"
          key={addon.addonId}
        >
          <span>{addon.name}</span>
          <Chip>{formatAddonPrice(addon)}</Chip>
        </li>
      ))}
    </ul>
  );
}

function RoomInfo({ room }: { room: PublicRoom }) {
  return (
    <div className="flex flex-col gap-4">
      <RoomChips room={room} />
      <Separator />
      {room.description ? <p className="text-sm">{room.description}</p> : null}
      {room.practicalNotes ? (
        <p className="text-muted-foreground text-sm">{room.practicalNotes}</p>
      ) : null}
      <Separator />
      <h2 className="font-medium text-lg">{messages.rooms.addonsSection}</h2>
      <AddonList room={room} />
    </div>
  );
}

function RoomPhotos({ room }: { room: PublicRoom }) {
  const alt = messages.rooms.imageAlt.replace("{name}", room.name);
  if (room.images.length === 0) {
    return <div className="aspect-video w-full rounded-lg bg-muted" />;
  }
  return (
    <>
      {/* Stacked on tablet and desktop; a carousel on phone, so the photos
          do not push the room's details off the first screen. */}
      <RoomPhotoCarousel
        className="rounded-lg md:hidden"
        images={room.images}
        name={room.name}
      />
      <div className="hidden flex-col gap-4 md:flex">
        {room.images.map((src) => (
          <Image
            alt={alt}
            className="w-full rounded-lg object-cover"
            height={IMAGE_HEIGHT}
            key={src}
            src={src}
            width={IMAGE_WIDTH}
          />
        ))}
      </div>
    </>
  );
}

type Query = Record<string, string | string[] | undefined>;

// Back to the rooms: the search results when the visitor came from a
// search (the query is kept), the full list otherwise.
function RoomBreadcrumb({ name, query }: { name: string; query: Query }) {
  const search = parseRoomSearch(query);
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        <BreadcrumbItem>
          <BreadcrumbLink
            render={<Link href={`/rooms${roomSearchQuery(search ?? {})}`} />}
          >
            {search ? messages.rooms.freeTitle : messages.rooms.listTitle}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// The room detail page (DESIGN.md "Book lokale" step 4): info left, photos
// right, one column on phone with photos first, and the sticky bar with
// "Book nu". A slot in the URL (from a search) pre-fills the booking dialog,
// which opens only when the visitor presses "Book nu".
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ roomId }, query] = await Promise.all([params, searchParams]);
  const prefill = parseRoomPrefill(query);
  const session = await requireSession();
  const supabase = await createClient();
  const [room, viewer] = await Promise.all([
    findPublicRoom(supabase, roomId),
    getBookingViewer(supabase, session),
  ]);
  if (!room) {
    notFound();
  }
  const initialDate = prefill.dato ?? cphDate(new Date());
  const initialPeriods = await listRoomDayPeriods(
    supabase,
    room.roomId,
    initialDate
  );
  const discountPercent = viewerDiscount(viewer);

  return (
    <>
      {/* Title and breadcrumb are one block: tighter than the column's
          gap between title, panel and footer line. */}
      <div className="flex flex-col gap-1">
        <PageHeader title={room.name} />
        <RoomBreadcrumb name={room.name} query={query} />
      </div>
      <PagePanel>
        {/* Desktop: card and bar share one grid cell, so the bar lies on
            the card's bottom edge as part of the content and the photos
            scroll behind it; the columns keep bottom room so the last
            photo clears the bar. Nothing outside the card scrolls. Below
            lg the two stack, and the bar is the panel's bottom edge:
            sticky while the content scrolls, its padding cancelled (the
            panel is the scroll container from md, hence the offset). */}
        <div className="flex flex-1 flex-col gap-6 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
          <Card className="lg:min-h-0 lg:[grid-area:1/1]">
            <CardContent className="grid gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[2fr_3fr] lg:grid-rows-[minmax(0,1fr)]">
              <div className="order-2 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pb-24">
                <RoomInfo room={room} />
              </div>
              <div className="order-1 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:pb-24">
                <RoomPhotos room={room} />
              </div>
            </CardContent>
          </Card>
          <div className="sticky bottom-0 z-10 -mx-3 mt-auto -mb-3 flex items-center justify-between gap-4 rounded-b-xl border-t bg-card p-4 shadow-sm md:-bottom-3 lg:static lg:m-0 lg:self-end lg:[grid-area:1/1]">
            <span className="font-medium max-md:hidden">{room.name}</span>
            <PriceRow
              discountPercent={discountPercent}
              hourlyPriceOre={room.hourlyPriceOre}
            />
            <BookRoom
              initialDate={initialDate}
              initialPeriods={initialPeriods}
              prefill={prefill}
              room={room}
              viewer={viewer}
            />
          </div>
        </div>
      </PagePanel>
    </>
  );
}
