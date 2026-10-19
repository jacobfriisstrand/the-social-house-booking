"use client";

// The clickable table row shared by the tables that open a row's sheet or
// detail: click and keyboard both work (the member Bookinger rows'
// pattern), so a row is reachable without the ⋯ menu.
import type * as React from "react";

export function openRowWith<T>(
  row: T,
  open: (row: T) => void
): {
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
} {
  return {
    onClick: () => open(row),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(row);
      }
    },
  };
}
