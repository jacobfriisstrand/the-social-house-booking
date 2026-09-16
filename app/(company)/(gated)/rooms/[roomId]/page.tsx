import { MapPinIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BookRoom } from "@/components/bookings/book-room";
import { formatAddonPrice } from "@/components/rooms/addon-price";
import { PriceRow } from "@/components/rooms/price-row";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth/require-session";
import { listRoomDayPeriods } from "@/lib/bookings/availability";
import { getBookingViewer, viewerDiscount } from "@/lib/bookings/viewer";
import { cphDate } from "@/lib/domain/opening-hours";
import { formatKroner } from "@/lib/format";
import { findPublicRoom, type PublicRoom } from "@/lib/rooms/public-data";
import { createClient } from "@/lib/supabase/server";
import { parseRoomPrefill } from "@/lib/validation/room-search";
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
    <div className="flex flex-col gap-4">
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
  );
}

// The room detail page (DESIGN.md "Book lokale" step 4): info left, photos
// right, one column on phone with photos first, and the sticky bar with
// "Book nu". A pre-filled slot in the URL opens the booking dialog at once.
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
      <PageHeader title={room.name} />
      <PagePanel>
        <Card>
          <CardContent className="grid gap-8 lg:grid-cols-[2fr_3fr]">
            <div className="order-2 lg:order-1">
              <RoomInfo room={room} />
            </div>
            <div className="order-1 lg:order-2">
              <RoomPhotos room={room} />
            </div>
          </CardContent>
        </Card>
        <div className="sticky bottom-4 z-10 mt-auto flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm max-md:fixed max-md:inset-x-4">
          <span className="font-medium">{room.name}</span>
          <PriceRow
            discountPercent={discountPercent}
            hourlyPriceOre={room.hourlyPriceOre}
          />
          <BookRoom
            defaultOpen={Boolean(prefill.dato)}
            initialDate={initialDate}
            initialPeriods={initialPeriods}
            prefill={prefill}
            room={room}
            viewer={viewer}
          />
        </div>
      </PagePanel>
    </>
  );
}
