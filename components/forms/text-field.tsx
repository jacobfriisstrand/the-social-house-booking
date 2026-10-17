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
  className?: string;
  control: Control<Values>;
  description?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
  label: string;
  maxLength?: number;
  name: Path<Values>;
  required?: boolean;
  type?: "email" | "number" | "password" | "tel" | "text";
}

// A number input reports NaN while empty; the change handler writes
// undefined instead, so an absent value stays absent for the schema and
// the control shows "".
const displayValue = (value: unknown): string | number => {
  if (typeof value === "number") {
    return Number.isNaN(value) ? "" : value;
  }
  return typeof value === "string" ? value : "";
};

export function TextField<Values extends FieldValues>({
  autoComplete,
  className,
  control,
  description,
  disabled,
  inputMode,
  label,
  maxLength,
  name,
  required = true,
  type = "text",
}: TextFieldProps<Values>) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  const { onChange } = field;
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (type !== "number") {
        onChange(event.target.value);
        return;
      }
      // A cleared or partial number input reports NaN. Write null, never
      // undefined: RHF reads a Controller change of undefined as "back to
      // the default value", which snaps a prefilled field shut — the
      // schema rejects null with the field's own message instead.
      const value = event.target.valueAsNumber;
      onChange(Number.isNaN(value) ? null : value);
    },
    [onChange, type]
  );

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        aria-invalid={fieldState.invalid}
        autoComplete={autoComplete}
        className={className}
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        maxLength={maxLength}
        name={field.name}
        onBlur={field.onBlur}
        onChange={handleChange}
        ref={field.ref}
        required={required}
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
