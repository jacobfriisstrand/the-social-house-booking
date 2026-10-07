"use client";

// The notice board's rooms (DESIGN.md "Hjem" 3): a framing card with the
// section title, the prev/next ghost buttons top right, and a horizontal
// carousel of room cards. Cards open the room detail page.
import { RoomCard, type RoomCardRoom } from "@/components/rooms/room-card";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { messages } from "@/messages/da";

const copy = messages.home;

export function RoomCarousel({
  discountPercent,
  rooms,
}: {
  discountPercent: number | null;
  rooms: RoomCardRoom[];
}) {
  if (rooms.length === 0) {
    return null;
  }
  return (
    // The carousel wraps the card so the header's arrows and the content
    // share its context. shrink-0: see the notice strip.
    <Carousel className="shrink-0" opts={{ align: "start" }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{copy.roomsTitle}</h2>
          </CardTitle>
          <CardAction className="flex gap-2">
            <CarouselPrevious
              aria-label={copy.previousRooms}
              className="static my-0"
              size="icon"
              variant="ghost"
            />
            <CarouselNext
              aria-label={copy.nextRooms}
              className="static my-0"
              size="icon"
              variant="ghost"
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* The 1px padding keeps the room cards' outline inside the
              carousel's clipping viewport, on every side: without the left
              one the first card lost its left edge (#15). */}
          <CarouselContent className="p-px">
            {rooms.map((room) => (
              // Three in view from lg, as on Lokaler: at four they read
              // too small (#15).
              <CarouselItem
                className="md:basis-1/2 lg:basis-1/3"
                key={room.roomId}
              >
                <RoomCard
                  discountPercent={discountPercent}
                  href={`/rooms/${room.roomId}`}
                  room={room}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </CardContent>
      </Card>
    </Carousel>
  );
}
