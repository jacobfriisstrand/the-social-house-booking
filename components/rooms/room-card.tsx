"use client";

// A room card (DESIGN.md "Book lokale" step 3): photo carousel with two
// round ghost arrows, name, capacity and location chips, the price row.
// The card opens the room detail page.
import { MapPinIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/da";
import { PriceRow } from "./price-row";
import { RoomPhotoCarousel } from "./room-photo-carousel";

export interface RoomCardRoom {
  capacity: number;
  hourlyPriceOre: number;
  images: string[];
  location: string | null;
  name: string;
  roomId: string;
}

interface RoomCardProps {
  discountPercent: number | null;
  href: string;
  room: RoomCardRoom;
}

function RoomPhotos({ room }: { room: RoomCardRoom }) {
  if (room.images.length === 0) {
    return <div className="aspect-video w-full rounded-t-xl bg-muted" />;
  }
  return <RoomPhotoCarousel images={room.images} name={room.name} />;
}

export function RoomCard({ discountPercent, href, room }: RoomCardProps) {
  return (
    <Card className="gap-4 pt-0">
      <RoomPhotos room={room} />
      <CardHeader>
        <CardTitle className="text-lg">
          <Link className="hover:underline" href={href}>
            {room.name}
          </Link>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full bg-secondary/40" variant="outline">
            <UsersIcon aria-hidden="true" />
            {messages.rooms.capacityChip(room.capacity)}
          </Badge>
          {room.location ? (
            <Badge className="rounded-full bg-secondary/40" variant="outline">
              <MapPinIcon aria-hidden="true" />
              {room.location}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <PriceRow
          discountPercent={discountPercent}
          hourlyPriceOre={room.hourlyPriceOre}
        />
      </CardContent>
    </Card>
  );
}
