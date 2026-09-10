"use client";

import { useCallback } from "react";
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectFieldItem {
  label: string;
  value: string;
}

interface SelectFieldProps<Values extends FieldValues> {
  control: Control<Values>;
  items: SelectFieldItem[];
  label: string;
  name: Path<Values>;
}

// Base UI Select: `items` on the root, no placeholder prop (docs/agents/ui.md).
export function SelectField<Values extends FieldValues>({
  control,
  items,
  label,
  name,
}: SelectFieldProps<Values>) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  // Base UI passes (value, eventDetails); only the value reaches the form.
  const { onChange } = field;
  const handleValueChange = useCallback(
    (value: string | null) => onChange(value ?? ""),
    [onChange]
  );

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        name={field.name}
        onValueChange={handleValueChange}
        value={String(field.value ?? "")}
      >
        <SelectTrigger
          aria-invalid={fieldState.invalid}
          className="w-full"
          id={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}
