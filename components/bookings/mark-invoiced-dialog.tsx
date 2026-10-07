"use client";

// The bulk "Markér som faktureret" dialog (#9): the selected bookings, the
// invoice date and the invoice number from e-conomic. The who/when are the
// database trigger's (schemas/bookings.sql), so the form carries the two
// fields the admin actually knows. Success closes the dialog; the fresh
// statuses arrive with the revalidated table.
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { type Control, useController, useForm } from "react-hook-form";
import { DatePicker } from "@/components/forms/date-picker";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { markBookingsInvoiced } from "@/lib/bookings/invoicing-actions";
import {
  type MarkInvoicedValues,
  markInvoicedSchema,
} from "@/lib/validation/invoicing";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin.markInvoiced;

function InvoiceDateField({
  control,
}: {
  control: Control<MarkInvoicedValues>;
}) {
  const { field, fieldState } = useController({ control, name: "invoiceDate" });
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="invoice-date" required>
        {copy.date}
      </FieldLabel>
      <DatePicker
        id="invoice-date"
        label={copy.date}
        onChange={field.onChange}
        value={field.value}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

export function MarkInvoicedDialog({
  bookingIds,
  onDone,
  open,
  onOpenChange,
}: {
  bookingIds: string[];
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const form = useForm<MarkInvoicedValues>({
    defaultValues: { bookingIds, invoiceDate: "", invoiceNumber: "" },
    resolver: zodResolver(markInvoicedSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: markBookingsInvoiced,
    form,
    successMessage: copy.saved,
  });
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // The selection is a prop, not a field: the dialog remounts with the
  // current selection each time it opens.
  useEffect(() => {
    if (open) {
      form.reset({ bookingIds, invoiceDate: "", invoiceNumber: "" });
    }
  }, [open, bookingIds, form]);

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onDone();
    }
  }, [state, onOpenChange, onDone]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.sentence(bookingIds.length)}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
          <FieldGroup>
            <InvoiceDateField control={form.control} />
            <TextField
              control={form.control}
              inputMode="numeric"
              label={copy.number}
              name="invoiceNumber"
            />
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button onClick={close} type="button" variant="outline">
              {messages.common.closeSheet}
            </Button>
            <PendingButton
              idleLabel={copy.submit}
              pending={pending}
              pendingLabel={copy.submitting}
              type="submit"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
