"use client";

import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { messages } from "@/messages/da";

interface BookerValues {
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
}

// The responsible booker (Bilag 1, ADR-0004): a person, verified by the
// code sent to this work email. One field per row.
export function BookerFields<Values extends BookerValues>({
  control,
}: {
  control: Control<Values>;
}) {
  const c = control as unknown as Control<BookerValues>;
  return (
    <FieldGroup className="gap-4">
      <TextField
        autoComplete="name"
        control={c}
        label={messages.booking.fields.bookerName}
        name="bookerName"
      />
      <TextField
        autoComplete="email"
        control={c}
        label={messages.booking.fields.bookerEmail}
        name="bookerEmail"
        type="email"
      />
      <TextField
        autoComplete="tel"
        control={c}
        label={messages.booking.fields.bookerPhone}
        name="bookerPhone"
        type="tel"
      />
    </FieldGroup>
  );
}
