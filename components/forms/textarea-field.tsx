"use client";

import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface TextareaFieldProps<Values extends FieldValues> {
  control: Control<Values>;
  label: string;
  name: Path<Values>;
}

export function TextareaField<Values extends FieldValues>({
  control,
  label,
  name,
}: TextareaFieldProps<Values>) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        {...field}
        aria-invalid={fieldState.invalid}
        id={id}
        rows={3}
        value={typeof field.value === "string" ? field.value : ""}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}
