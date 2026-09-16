"use client";

// A room card (DESIGN.md "Book lokale" step 3): photo carousel with two
// round ghost arrows, name, capacity and location chips, the price row.
// The card opens the room detail page.
import { MapPinIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { messages } from "@/messages/da";
import { PriceRow } from "./price-row";

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

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 400;

function RoomPhotos({ room }: { room: RoomCardRoom }) {
  const alt = messages.rooms.imageAlt.replace("{name}", room.name);
  if (room.images.length === 0) {
    return <div className="aspect-video w-full rounded-t-xl bg-muted" />;
  }
  return (
    <Carousel aria-label={room.name} opts={{ loop: true }}>
      <CarouselContent className="ml-0">
        {room.images.map((src) => (
          <CarouselItem className="pl-0" key={src}>
            <Image
              alt={alt}
              className="aspect-video w-full object-cover"
              height={IMAGE_HEIGHT}
              src={src}
              width={IMAGE_WIDTH}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {room.images.length > 1 ? (
        <>
          <CarouselPrevious
            className="absolute right-12 bottom-2 left-auto rounded-full bg-card/80"
            size="icon"
            variant="ghost"
          />
          <CarouselNext
            className="absolute right-2 bottom-2 rounded-full bg-card/80"
            size="icon"
            variant="ghost"
          />
        </>
      ) : null}
    </Carousel>
  );
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
