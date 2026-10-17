"use client";

// #124: the foyer screen re-renders itself every five minutes — a plain
// router refresh of the server component, no socket, no polling of its
// own. A kiosk tab left open stays current without anyone touching it.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_MS = 5 * 60_000;

export function FoyerRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
