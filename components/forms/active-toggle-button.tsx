"use client";

// Deactivate/reactivate a catalogue row without a confirm dialog:
// deactivation is reversible and never destroys history. One button serves
// rooms and add-ons — the caller supplies the Server Action (id, next) and
// the copy.
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type ActiveToggleResult =
  | { status: "success" }
  | { status: "error"; error: string };

export function ActiveToggleButton({
  activateLabel,
  deactivateLabel,
  id,
  isActive,
  onToggle,
  size = "sm",
  updatedTitle,
}: {
  activateLabel: string;
  deactivateLabel: string;
  id: string;
  isActive: boolean;
  onToggle: (id: string, next: boolean) => Promise<ActiveToggleResult>;
  size?: "sm" | "default";
  updatedTitle: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleToggle = useCallback((): void => {
    setPending(true);
    const toggle = async (): Promise<void> => {
      const result = await onToggle(id, !isActive);
      setPending(false);
      if (result.status === "success") {
        toast.add({ title: updatedTitle, type: "success" });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    };
    toggle();
  }, [id, isActive, onToggle, router, updatedTitle]);

  const label = isActive ? deactivateLabel : activateLabel;

  return (
    <Button
      disabled={pending}
      onClick={handleToggle}
      size={size}
      type="button"
      variant={isActive ? "destructive" : "ghost"}
    >
      {label}
    </Button>
  );
}
