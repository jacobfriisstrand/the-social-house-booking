"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
// A −/+ stepper composed as one button group (mockup 2026-10-17): minus,
// the value, plus, joined into a single outlined control. The − and +
// buttons disable at [min, max]; the clamp in `set` only guards
// programmatic writes. Controlled — the caller owns the value and decides
// what an unset field displays. Labels come from the caller's messages
// (docs/agents/ui.md: copy is feature-keyed, no literals in components).
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";

export interface QuantityPickerProps {
  decreaseLabel: string;
  increaseLabel: string;
  label: string;
  max: number;
  min?: number;
  onValueChange: (value: number) => void;
  // A Button icon size; the number cell tracks it so the three cells read
  // as one control. Defaults to the compact size the add-on rows use.
  size?: "icon" | "icon-sm" | "icon-xs";
  value: number;
}

// Width tracks the button size, and the number's text size matches it:
// icon-xs → text-xs, icon-sm → text-sm, icon → text-base.
const numberSize = {
  icon: "min-w-8 text-base",
  "icon-sm": "min-w-7 text-sm",
  "icon-xs": "min-w-6 text-xs",
} as const;

export function QuantityPicker({
  decreaseLabel,
  increaseLabel,
  label,
  max,
  min = 1,
  onValueChange,
  size = "icon",
  value,
}: QuantityPickerProps) {
  const set = useCallback(
    (next: number): void => {
      onValueChange(Math.min(Math.max(min, next), max));
    },
    [onValueChange, min, max]
  );
  const decrease = useCallback(() => set(value - 1), [set, value]);
  const increase = useCallback(() => set(value + 1), [set, value]);

  return (
    <ButtonGroup aria-label={label} className="-mt-0.5">
      <Button
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={decrease}
        size={size}
        type="button"
        variant="outline"
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <ButtonGroupText
        className={cn(
          "flex items-center justify-center border-input border-r border-l bg-transparent px-1 font-normal tabular-nums",
          numberSize[size]
        )}
      >
        {value}
      </ButtonGroupText>
      <Button
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={increase}
        size={size}
        type="button"
        variant="outline"
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
}
