"use client";

// The manual-amount side panel (#16, ADR-0010): the amounts already added
// to an ended booking with their audit (who/when), each removable, and the
// form that adds one — the same right-hand sheet as every admin edit
// (DESIGN.md "Other admin pages"). Adding keeps the sheet open, since the
// entries list is the point, and resets the form for the next amount.
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ManualAmountEntry } from "@/lib/domain/booking-overview";
import { formatDateTime, formatOre } from "@/lib/format";
import {
  addManualAmount,
  removeManualAmount,
} from "@/lib/manual-amounts/actions";
import {
  type AddManualAmountValues,
  addManualAmountSchema,
} from "@/lib/validation/manual-amounts";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.manualAmounts;

// A number input reports NaN while empty; the control shows "".
const emptyAmount = Number.NaN;

function ManualAmountList({
  manualAmounts,
}: {
  manualAmounts: ManualAmountEntry[];
}) {
  if (manualAmounts.length === 0) {
    return (
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm">{copy.emptyTitle}</p>
        <p className="text-muted-foreground text-sm">{copy.emptyDescription}</p>
      </CardContent>
    );
  }
  return (
    <CardContent>
      <ul className="flex flex-col">
        {manualAmounts.map((entry) => (
          <li
            className="flex items-start justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
            key={entry.manualAmountId}
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium tabular-nums">
                {formatOre(entry.amountOre)}
              </span>
              <span className="text-sm">{entry.note}</span>
              <span className="text-muted-foreground text-xs">
                {copy.addedBy(
                  entry.createdByName,
                  formatDateTime(entry.createdAt)
                )}
              </span>
            </div>
            <ConfirmDeleteButton
              copy={copy}
              id={entry.manualAmountId}
              onDelete={removeManualAmount}
            />
          </li>
        ))}
      </ul>
    </CardContent>
  );
}

function ManualAmountForm({ bookingId }: { bookingId: string }) {
  const form = useForm<AddManualAmountValues>({
    defaultValues: { amountKroner: emptyAmount, bookingId, note: "" },
    resolver: zodResolver(addManualAmountSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: addManualAmount,
    form,
    successMessage: copy.saved,
  });

  // The sheet stays open; the fresh entry arrives with the revalidated
  // table, and the form is ready for the next amount.
  useEffect(() => {
    if (state.status === "success") {
      form.reset({ amountKroner: emptyAmount, bookingId, note: "" });
    }
  }, [state, form, bookingId]);

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
      <FieldGroup>
        <TextField
          control={form.control}
          description={copy.fields.amountHint}
          inputMode="numeric"
          label={copy.fields.amount}
          name="amountKroner"
          type="number"
        />
        <TextareaField
          control={form.control}
          label={copy.fields.note}
          name="note"
        />
      </FieldGroup>
      <PendingButton
        idleLabel={copy.submit}
        pending={pending}
        pendingLabel={copy.submitting}
        type="submit"
      />
    </form>
  );
}

export function ManualAmountSheet({
  bookingId,
  bookingNumber,
  manualAmounts,
}: {
  bookingId: string;
  bookingNumber: string;
  manualAmounts: ManualAmountEntry[];
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        {copy.addButton}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{bookingNumber}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          <Card>
            <CardHeader>
              <CardTitle>{copy.entriesTitle}</CardTitle>
            </CardHeader>
            <ManualAmountList manualAmounts={manualAmounts} />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{copy.addButton}</CardTitle>
            </CardHeader>
            <CardContent>
              <ManualAmountForm bookingId={bookingId} />
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
