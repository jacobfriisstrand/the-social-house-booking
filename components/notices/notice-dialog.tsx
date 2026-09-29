"use client";

// Create or edit a notice (admin, #12; DESIGN.md "Opslag (admin)"): title,
// text, the on/off switch and an optional last day it shows (decided in
// #12). One schema with the server action (lib/validation/notices.ts).
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { type Control, useController, useForm } from "react-hook-form";
import { DatePicker } from "@/components/forms/date-picker";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { saveNotice } from "@/lib/notices/actions";
import {
  type NoticeFormValues,
  noticeFormSchema,
} from "@/lib/validation/notices";
import { messages } from "@/messages/da";

const copy = messages.notices;

const EMPTY_NOTICE: NoticeFormValues = {
  body: "",
  isActive: true,
  lastDay: "",
  title: "",
};

function ActiveField({ control }: { control: Control<NoticeFormValues> }) {
  const { field } = useController({ control, name: "isActive" });
  return (
    <Field orientation="horizontal">
      <Switch
        checked={field.value}
        id="notice-is-active"
        onCheckedChange={field.onChange}
      />
      <FieldLabel className="font-normal" htmlFor="notice-is-active">
        {copy.fields.isActive}
      </FieldLabel>
    </Field>
  );
}

// The last day it shows, or none: then it shows until switched off.
function LastDayField({ control }: { control: Control<NoticeFormValues> }) {
  const { field } = useController({ control, name: "lastDay" });
  const { onChange } = field;
  const clear = useCallback(() => onChange(""), [onChange]);
  return (
    <Field>
      <FieldLabel htmlFor="notice-last-day">{copy.fields.lastDay}</FieldLabel>
      <div className="flex gap-2">
        <DatePicker
          id="notice-last-day"
          label={copy.fields.lastDay}
          onChange={onChange}
          value={field.value}
        />
        {field.value ? (
          <Button onClick={clear} size="lg" type="button" variant="ghost">
            {copy.clearLastDay}
          </Button>
        ) : null}
      </div>
      <FieldDescription>{copy.fields.lastDayHint}</FieldDescription>
    </Field>
  );
}

function NoticeForm({
  initial,
  onSaved,
}: {
  initial: NoticeFormValues;
  onSaved: () => void;
}) {
  const form = useForm<NoticeFormValues>({
    defaultValues: initial,
    resolver: zodResolver(noticeFormSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: saveNotice,
    form,
    successMessage: copy.saved,
  });

  useEffect(() => {
    if (state.status === "success") {
      onSaved();
    }
  }, [state, onSaved]);

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <FieldGroup>
        <TextField
          control={form.control}
          label={copy.fields.title}
          maxLength={120}
          name="title"
        />
        <TextareaField
          control={form.control}
          label={copy.fields.body}
          name="body"
        />
        <LastDayField control={form.control} />
        <ActiveField control={form.control} />
      </FieldGroup>
      <PendingButton
        idleLabel={copy.submit}
        pending={pending}
        pendingLabel={copy.saving}
        type="submit"
      />
    </form>
  );
}

// The notice in edit mode; null in create mode. The form mounts with the
// dialog, so every open starts from the saved values.
export function NoticeDialog({
  initial,
}: {
  initial: NoticeFormValues | null;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trigger = initial ? (
    <Button size="sm" type="button" variant="outline" />
  ) : (
    <Button type="button" />
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={trigger}>
        {initial ? copy.editLabel : copy.createButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? copy.editTitle : copy.createTitle}
          </DialogTitle>
        </DialogHeader>
        <NoticeForm initial={initial ?? EMPTY_NOTICE} onSaved={close} />
      </DialogContent>
    </Dialog>
  );
}
