import { RoomCard, type RoomCardRoom } from "@/components/rooms/room-card";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

interface RoomGridProps {
  discountPercent: number | null;
  emptyDescription: string;
  emptyTitle: string;
  // Query string carried on to the detail page (the search, if any).
  query: string;
  rooms: RoomCardRoom[];
}

// The 3-column card grid (1 on phone, 2 on tablet) with the DESIGN.md empty
// state: a white bordered card, py-16, centred.
export function RoomGrid({
  discountPercent,
  emptyDescription,
  emptyTitle,
  query,
  rooms,
}: RoomGridProps) {
  if (rooms.length === 0) {
    return (
      <Card className="py-16">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard
          discountPercent={discountPercent}
          href={`/rooms/${room.roomId}${query}`}
          key={room.roomId}
          room={room}
        />
      ))}
    </div>
  );
}
