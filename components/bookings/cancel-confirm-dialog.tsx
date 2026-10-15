"use client";

// The confirm before a cancellation (DESIGN.md "Confirm before destroying",
// the cancellation exception): what is being cancelled with its live fee,
// a secondary "Behold bookingen" and a destructive "Bekræft afbooking".
// The member's booking sheet and the admin screens pass their own title,
// summary and action; every action recomputes the fee server-side at the
// exact confirm moment (#5, ADR-0006). It mounts only while confirming, so
// a refresh or an error cannot leave a dead dialog open.
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings.sheet;
const cancellationCopy = messages.cancellation;

// What every cancel action returns: the registered fee, or why not.
export type CancelResult =
  | { feeOre: number; status: "cancelled" }
  | { error: string; status: "error" };

// fallow-ignore-next-line complexity
export function CancelConfirmDialog({
  cancel,
  children,
  onClose,
  title,
}: {
  cancel: () => Promise<CancelResult>;
  // The summary under the title: the booking and its live fee.
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The dialog only closes; opening happens where it mounts.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const confirm = useCallback(() => {
    startTransition(async () => {
      const result = await cancel();
      if (result.status === "cancelled") {
        toast.add({
          title:
            result.feeOre > 0
              ? copy.successWithFee(formatOre(result.feeOre))
              : copy.successWithoutFee,
          type: "success",
        });
      } else {
        // The slot may have slipped past while the screen was open; the
        // row's status is re-read on refresh either way.
        toast.add({ title: result.error, type: "error" });
      }
      router.refresh();
      onClose();
    });
  }, [cancel, onClose, router]);

  return (
    <Dialog onOpenChange={handleOpenChange} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter className="justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            {cancellationCopy.keepBooking}
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending ? cancellationCopy.confirming : cancellationCopy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
