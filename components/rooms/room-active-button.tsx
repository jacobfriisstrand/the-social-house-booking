"use client";

import { ActiveToggleButton } from "@/components/forms/active-toggle-button";
import { setRoomActive } from "@/lib/rooms/actions";
import { messages } from "@/messages/da";

export function RoomActiveButton({
  isActive,
  roomId,
  size = "sm",
}: {
  roomId: string;
  isActive: boolean;
  size?: "sm" | "default";
}) {
  return (
    <ActiveToggleButton
      activateLabel={messages.rooms.activate}
      deactivateLabel={messages.rooms.deactivate}
      id={roomId}
      isActive={isActive}
      onToggle={setRoomActive}
      size={size}
      updatedTitle={messages.rooms.activeUpdated}
    />
  );
}
