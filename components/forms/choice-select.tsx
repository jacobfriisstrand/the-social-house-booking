"use client";

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ChoiceItem {
  label: string;
  value: string;
}

interface ChoiceSelectProps {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  items: ChoiceItem[];
  onChange: (value: string) => void;
  placeholder?: string;
  value: string | null;
}

// A single-choice Base UI Select over string values (docs/agents/ui.md:
// Select needs the items prop). A null value shows the placeholder.
export function ChoiceSelect({
  ariaLabel,
  className,
  disabled = false,
  id,
  invalid = false,
  items,
  onChange,
  placeholder,
  value,
}: ChoiceSelectProps) {
  const handleValueChange = useCallback(
    (next: unknown): void => {
      if (typeof next === "string") {
        onChange(next);
      }
    },
    [onChange]
  );

  return (
    <Select
      disabled={disabled}
      items={items}
      onValueChange={handleValueChange}
      value={value}
    >
      <SelectTrigger
        aria-invalid={invalid}
        aria-label={ariaLabel}
        className={cn("w-full", className)}
        id={id}
      >
        <SelectValue placeholder={placeholder} />
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
  );
}
