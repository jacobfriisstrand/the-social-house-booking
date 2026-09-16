"use client";

import { ChoiceSelect } from "@/components/forms/choice-select";

interface TimeSelectProps {
  ariaLabel: string;
  disabled?: boolean;
  items: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  value: string;
}

// Shared 30-minute time select: a narrow ChoiceSelect.
export function TimeSelect({
  ariaLabel,
  disabled = false,
  items,
  onChange,
  value,
}: TimeSelectProps) {
  return (
    <ChoiceSelect
      ariaLabel={ariaLabel}
      className="w-24"
      disabled={disabled}
      items={items}
      onChange={onChange}
      value={value}
    />
  );
}
