"use client";

// Deactivate/reactivate a catalogue row without a confirm dialog:
// deactivation is reversible and never destroys history. The row menus
// (rooms, add-ons, notices) run the move through this hook — the caller
// supplies the Server Action (id, next) and the copy.
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
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
