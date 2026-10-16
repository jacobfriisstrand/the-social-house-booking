"use client";

// The ⋯ menu's two pickings shared by the tilkøb, opslag and House
// Events tables: which row's sheet is open and which row the
// confirm-guarded delete targets, with the close handlers the controlled
// sheet and dialog expect.
import { useCallback, useState } from "react";

export function useMenuDialogs<T>() {
  const [deleting, setDeleting] = useState<T | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const closeDelete = useCallback((open: boolean) => {
    if (!open) {
      setDeleting(null);
    }
  }, []);
  const closeEditor = useCallback((open: boolean) => {
    if (!open) {
      setEditing(null);
    }
  }, []);
  return {
    closeDelete,
    closeEditor,
    deleting,
    editing,
    setDeleting,
    setEditing,
  };
}
