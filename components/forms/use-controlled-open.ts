"use client";

// Controlled-or-uncontrolled open state for the row sheets and dialogs:
// the tables open a row's edit sheet or confirm dialog from the ⋯ menu
// (no trigger), while the page-level create buttons keep their own
// trigger. One hook serves both shapes.
import { useState } from "react";

export function useControlledOpen(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined
): [boolean, (open: boolean) => void] {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = onOpenChange !== undefined;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;
  const currentOpen = isControlled ? (open ?? false) : uncontrolledOpen;
  return [currentOpen, setOpen];
}
