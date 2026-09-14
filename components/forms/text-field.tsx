"use client";

import { type ChangeEvent, useCallback } from "react";
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export interface TextFieldProps<Values extends FieldValues> {
  autoComplete?: string;
  control: Control<Values>;
  description?: string;
  label: string;
  name: Path<Values>;
  type?: "email" | "number" | "password" | "tel" | "text";
}

// A number input reports NaN while empty; the control shows "" instead.
const displayValue = (value: unknown): string | number => {
  if (typeof value === "number") {
    return Number.isNaN(value) ? "" : value;
  }
  return typeof value === "string" ? value : "";
};

export function TextField<Values extends FieldValues>({
  autoComplete,
  control,
  description,
  label,
  name,
  type = "text",
}: TextFieldProps<Values>) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  const { onChange } = field;
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange(
        type === "number" ? event.target.valueAsNumber : event.target.value
      ),
    [onChange, type]
  );

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-invalid={fieldState.invalid}
        autoComplete={autoComplete}
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onChange={handleChange}
        ref={field.ref}
        type={type}
        value={displayValue(field.value)}
      />
      {fieldState.invalid ? (
        <FieldError errors={[fieldState.error]} />
      ) : (
        <FieldDescription hidden={!description}>{description}</FieldDescription>
      )}
    </Field>
  );
}
