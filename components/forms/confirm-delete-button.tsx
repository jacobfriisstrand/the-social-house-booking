"use client";

// "Slet" on a table row with the DESIGN.md confirm: the consequence in one
// sentence, a secondary "Fortryd" and a destructive confirm. One button
// serves notices and House Events; the caller supplies the Server Action
// and the copy.
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

type DeleteResult = { status: "success" } | { status: "error"; error: string };

export interface ConfirmDeleteCopy {
  delete: string;
  deleteConfirm: string;
  deleted: string;
  deleteSentence: string;
  deleteTitle: string;
  deleting: string;
  keep: string;
}

export function ConfirmDeleteButton({
  copy,
  id,
  onDelete,
}: {
  copy: ConfirmDeleteCopy;
  id: string;
  onDelete: (id: string) => Promise<DeleteResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  const confirm = useCallback(() => {
    startTransition(async () => {
      const result = await onDelete(id);
      if (result.status === "success") {
        toast.add({ title: copy.deleted, type: "success" });
        setOpen(false);
        router.refresh();
        return;
      }
      toast.add({ title: result.error, type: "error" });
    });
  }, [copy.deleted, id, onDelete, router]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        {copy.delete}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.deleteTitle}</DialogTitle>
          <DialogDescription>{copy.deleteSentence}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-end gap-2">
          <Button onClick={close} type="button" variant="outline">
            {copy.keep}
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? copy.deleting : copy.deleteConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
