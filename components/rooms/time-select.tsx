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

interface TimeSelectProps {
  ariaLabel: string;
  disabled?: boolean;
  items: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  value: string;
}

// Shared 30-minute time select (Base UI Select with the required items prop).
export function TimeSelect({
  ariaLabel,
  disabled = false,
  items,
  onChange,
  value,
}: TimeSelectProps) {
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
      <SelectTrigger aria-label={ariaLabel} className="w-24">
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
  );
}
