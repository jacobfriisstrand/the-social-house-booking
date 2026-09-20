"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setAddonActive } from "@/lib/addons/actions";
import { messages } from "@/messages/da";

// Deactivate/reactivate without a confirm dialog: deactivation is
// reversible and never destroys history (bookings keep referencing the
// add-on, confirmed bookings keep their frozen line).
export function AddonActiveButton({
  addonId,
  isActive,
  size = "sm",
}: {
  addonId: string;
  isActive: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleToggle = useCallback((): void => {
    setPending(true);
    const toggle = async (): Promise<void> => {
      const result = await setAddonActive(addonId, !isActive);
      setPending(false);
      if (result.status === "success") {
        toast.add({
          title: messages.addons.statusUpdated,
          type: "success",
        });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    };
    toggle();
  }, [addonId, isActive, router]);

  return (
    <Button
      disabled={pending}
      onClick={handleToggle}
      size={size}
      type="button"
      variant={isActive ? "destructive" : "ghost"}
    >
      {isActive ? messages.addons.deactivate : messages.addons.activate}
    </Button>
  );
}
