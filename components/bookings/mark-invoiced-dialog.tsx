"use client";

// The bulk "Markér som faktureret" dialog (#9): the selected bookings, the
// invoice date and the invoice number(s) from e-conomic. The default shows
// one field per company — a Rituals batch and a Nordic Events batch become
// two fields under two numbers — and unticking "Ét nummer pr. firma" gives
// each booking its own field (the action writes one update per distinct
// number either way). The who/when are the database trigger's
// (schemas/bookings.sql). Success closes the dialog; the fresh statuses
// arrive with the revalidated table.
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo } from "react";
import { type Control, useController, useForm } from "react-hook-form";
import { DatePicker } from "@/components/forms/date-picker";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/components/ui/toast";
import { markBookingsInvoiced } from "@/lib/bookings/invoicing-actions";
import { dateToIso } from "@/lib/calendar-date";
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

// The mode switch above the number fields: company mode shows one field
// per company; per-booking shows one field per row.
function CompanyModeField({
  control,
}: {
  control: Control<MarkInvoicedValues>;
}) {
  const { field } = useController({ control, name: "companyMode" });
  return (
    <Field orientation="horizontal">
      <Checkbox
        checked={field.value}
        id="invoice-company-mode"
        onCheckedChange={field.onChange}
      />
      <FieldLabel className="font-normal" htmlFor="invoice-company-mode">
        {copy.companyNumber}
      </FieldLabel>
    </Field>
  );
}

export function MarkInvoicedDialog({
  bookings,
  onDone,
  open,
  onOpenChange,
}: {
  // The dialog labels each company field with the company name and each
  // per-booking field with the booking number, so the selection carries
  // those, not bare ids.
  bookings: Array<{
    bookingId: string;
    bookingNumber: string;
    companyId: string;
    companyName: string;
  }>;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  // Stable while the caller's bookings prop holds: the reset effect below
  // keys on it, and a fresh array per render would wipe the fields
  // mid-typing.
  const ids = useMemo(
    () => bookings.map((booking) => booking.bookingId),
    [bookings]
  );
  // Company mode keys the numbers by company id, so the form carries the
  // company each booking belongs to (the action resolves numbers from it).
  const bookingCompanies = useMemo(
    () => Object.fromEntries(bookings.map((b) => [b.bookingId, b.companyId])),
    [bookings]
  );
  // One group per company, in selection order; the label carries the count
  // so the admin can check the grouping at a glance.
  const companyGroups = useMemo(() => {
    const groups = new Map<string, { companyName: string; count: number }>();
    for (const booking of bookings) {
      const group = groups.get(booking.companyId);
      if (group) {
        group.count += 1;
      } else {
        groups.set(booking.companyId, {
          companyName: booking.companyName,
          count: 1,
        });
      }
    }
    return [...groups];
  }, [bookings]);
  const form = useForm<MarkInvoicedValues>({
    defaultValues: {
      bookingCompanies,
      bookingIds: ids,
      companyMode: true,
      companyNumbers: {},
      // Today preselected (2026-10-16): an invoice is dated the day it is
      // written; the admin only moves it when e-conomic says otherwise.
      invoiceDate: dateToIso(new Date()),
      invoiceNumbers: {},
    },
    resolver: zodResolver(markInvoicedSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: markBookingsInvoiced,
    form,
  });
  const companyMode = form.watch("companyMode");
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // The selection is a prop, not a field: the dialog remounts with the
  // current selection each time it opens.
  useEffect(() => {
    if (open) {
      form.reset({
        bookingCompanies,
        bookingIds: ids,
        companyMode: true,
        companyNumbers: {},
        invoiceDate: dateToIso(new Date()),
        invoiceNumbers: {},
      });
    }
  }, [open, ids, bookingCompanies, form]);

  // The toast reads the ids the form submitted, not the prop: the prop
  // changes when the dialog closes (the selection clears), and a message
  // derived from it re-fires this effect with the wrong count — one toast
  // per successful submit, at the count that was submitted.
  useEffect(() => {
    if (state.status === "success") {
      toast.add({
        title: copy.saved(form.getValues("bookingIds").length),
        type: "success",
      });
      onOpenChange(false);
      onDone();
    }
  }, [state, onOpenChange, onDone, form]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.sentence(bookings.length)}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
          <FieldGroup>
            <InvoiceDateField control={form.control} />
            <CompanyModeField control={form.control} />
            {companyMode ? (
              <FieldGroup>
                {companyGroups.map(([companyId, group]) => (
                  <TextField
                    control={form.control}
                    inputMode="numeric"
                    key={companyId}
                    label={copy.companyBookings(group.companyName, group.count)}
                    name={`companyNumbers.${companyId}`}
                  />
                ))}
              </FieldGroup>
            ) : (
              <FieldGroup>
                {bookings.map((booking) => (
                  <TextField
                    control={form.control}
                    inputMode="numeric"
                    key={booking.bookingId}
                    label={booking.bookingNumber}
                    name={`invoiceNumbers.${booking.bookingId}`}
                  />
                ))}
              </FieldGroup>
            )}
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
