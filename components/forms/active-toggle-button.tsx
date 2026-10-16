"use client";

// Deactivate/reactivate a catalogue row without a confirm dialog:
// deactivation is reversible and never destroys history. One button serves
// rooms and add-ons — the caller supplies the Server Action (id, next) and
// the copy. The row menus run the same move through useActiveToggleAction.
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type ActiveToggleResult =
  | { status: "success" }
  | { status: "error"; error: string };

export function useActiveToggleAction(
  onToggle: (id: string, next: boolean) => Promise<ActiveToggleResult>,
  updatedTitle: string
): { pending: boolean; run: (id: string, next: boolean) => void } {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    (id: string, next: boolean): void => {
      startTransition(async () => {
        const result = await onToggle(id, next);
        if (result.status === "success") {
          toast.add({ title: updatedTitle, type: "success" });
          router.refresh();
        } else {
          toast.add({ title: result.error, type: "error" });
        }
      });
    },
    [onToggle, router, updatedTitle]
  );
  return { pending, run };
}

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
  const { pending, run } = useActiveToggleAction(onToggle, updatedTitle);
  const handleToggle = useCallback(
    () => run(id, !isActive),
    [id, isActive, run]
  );

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
