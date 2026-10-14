"use client";

// The URL-state loop both Bookinger pages run (#9): every control writes
// its change to the URL at once and the server re-reads the set, so the
// fresh params land one read later. A second control touched in that
// window must not build its URL from the stale props and drop the first
// change — the overlay carries what was pushed since the last read, and
// the fresh props clear it. Controls read `view`, the merged params, not
// the raw props. Every write is a transition: while the read is on the
// way `loading` lets the list show skeletons — loading.tsx does not fire
// for a search-param change.
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export function useViewParams<P extends object>(
  params: P,
  hrefOf: (params: P) => string
): {
  loading: boolean;
  // A whole new set of params (the reset), dropping the overlay.
  replace: (next: P) => void;
  update: (changes: Partial<P>) => void;
  view: P;
} {
  const router = useRouter();
  const paramsKey = hrefOf(params);
  const [overlay, setOverlay] = useState<Partial<P>>({});
  const [paramsRead, setParamsRead] = useState(paramsKey);
  if (paramsKey !== paramsRead) {
    // Fresh server params: they carry what the pushes asked for.
    setParamsRead(paramsKey);
    setOverlay({});
  }
  const [loading, startLoading] = useTransition();

  const update = useCallback(
    (changes: Partial<P>) => {
      // The merged overlay stands in until the props catch up, so a rapid
      // second control (or a second tick on the same one) accumulates
      // instead of clobbering.
      const merged = { ...overlay, ...changes };
      setOverlay(merged);
      startLoading(() => router.push(hrefOf({ ...params, ...merged })));
    },
    [hrefOf, overlay, params, router]
  );

  const replace = useCallback(
    (next: P) => {
      setOverlay({});
      startLoading(() => router.push(hrefOf(next)));
    },
    [hrefOf, router]
  );

  return { loading, replace, update, view: { ...params, ...overlay } };
}
