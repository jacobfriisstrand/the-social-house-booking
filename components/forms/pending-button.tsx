"use client";

// A button whose label and spinner follow its pending state (DESIGN.md:
// compose Spinner + disabled, Button has no loading prop).
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PendingButtonProps {
  disabled?: boolean;
  idleLabel: string;
  onClick?: () => void;
  pending: boolean;
  pendingLabel: string;
  type: "button" | "submit";
  variant?: "default" | "outline";
}

export function PendingButton({
  disabled = false,
  idleLabel,
  onClick,
  pending,
  pendingLabel,
  type,
  variant = "default",
}: PendingButtonProps) {
  const label = pending ? pendingLabel : idleLabel;
  return (
    <Button
      disabled={disabled || pending}
      onClick={onClick}
      type={type}
      variant={variant}
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
