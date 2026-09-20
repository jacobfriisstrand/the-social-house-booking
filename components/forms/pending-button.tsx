"use client";

// A button whose label and spinner follow its pending state (DESIGN.md:
// compose Spinner + disabled, Button has no loading prop).
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PendingButtonProps {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  onClick?: () => void;
  pending: boolean;
  pendingLabel: string;
  size?: "default" | "lg";
  type: "button" | "submit";
  variant?: "default" | "outline";
}

export function PendingButton({
  className,
  disabled = false,
  idleLabel,
  onClick,
  pending,
  pendingLabel,
  size = "default",
  type,
  variant = "default",
}: PendingButtonProps) {
  const label = pending ? pendingLabel : idleLabel;
  return (
    <Button
      className={className}
      disabled={disabled || pending}
      onClick={onClick}
      size={size}
      type={type}
      variant={variant}
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
