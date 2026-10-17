"use client";

// The booking headcount as the same segmented stepper the add-on
// quantities use (#119's control, shared via components/forms): writes
// clamp to 1..room capacity, so the free-typed number input and its
// invalid states are gone. The server's capacity check stays as the
// backstop for a room edited mid-dialog.
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { QuantityPicker } from "@/components/forms/quantity-picker";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/components/ui/field";
import { messages } from "@/messages/da";

export function ParticipantsField<Values extends FieldValues>({
  capacity,
  control,
  name,
}: {
  capacity: number;
  control: Control<Values>;
  name: Path<Values>;
}) {
  const { field, fieldState } = useController({ control, name });
  const label = messages.booking.fields.participantCount;

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldTitle>{label}</FieldTitle>
      <QuantityPicker
        decreaseLabel={messages.common.quantityDecrease}
        increaseLabel={messages.common.quantityIncrease}
        label={label}
        max={capacity}
        onValueChange={field.onChange}
        // The form always seeds a number (defaultValues); 1 is the schema
        // floor if it somehow is not.
        value={
          typeof field.value === "number" && !Number.isNaN(field.value)
            ? field.value
            : 1
        }
      />
      <FieldDescription>
        {messages.booking.dialog.participantsHint(capacity)}
      </FieldDescription>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}
