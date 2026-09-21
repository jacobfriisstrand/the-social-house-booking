"use client";

import { ActiveToggleButton } from "@/components/forms/active-toggle-button";
import { setAddonActive } from "@/lib/addons/actions";
import { messages } from "@/messages/da";

export function AddonActiveButton({
  addonId,
  isActive,
  size = "sm",
}: {
  addonId: string;
  isActive: boolean;
  size?: "sm" | "default";
}) {
  return (
    <ActiveToggleButton
      activateLabel={messages.addons.activate}
      deactivateLabel={messages.addons.deactivate}
      id={addonId}
      isActive={isActive}
      onToggle={setAddonActive}
      size={size}
      updatedTitle={messages.addons.statusUpdated}
    />
  );
}
