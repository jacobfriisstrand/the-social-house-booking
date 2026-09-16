"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setRoomActive } from "@/lib/rooms/actions";
import { messages } from "@/messages/da";

// Deactivate/reactivate without a confirm dialog: deactivation is reversible
// and never destroys history (bookings keep referencing the room).
export function RoomActiveButton({
  isActive,
  roomId,
  size = "sm",
}: {
  roomId: string;
  isActive: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleToggle = useCallback((): void => {
    setPending(true);
    const toggle = async (): Promise<void> => {
      const result = await setRoomActive(roomId, !isActive);
      setPending(false);
      if (result.status === "success") {
        toast.add({ title: messages.rooms.activeUpdated, type: "success" });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    };
    toggle();
  }, [isActive, roomId, router]);

  return (
    <Button
      disabled={pending}
      onClick={handleToggle}
      size={size}
      type="button"
      variant={isActive ? "destructive" : "ghost"}
    >
      {isActive ? messages.rooms.deactivate : messages.rooms.activate}
    </Button>
  );
}
