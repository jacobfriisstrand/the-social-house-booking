// The date-range picker's draft transition (the filter row's Periode
// control): react-day-picker's range mode has two quirks the calendar
// click flow has to absorb, and this pure function is the one place they
// live. rdp hands a single click back as a one-day range (to === from),
// and a click on a finished selection extends it instead of restarting —
// so the clicked day is whichever end moved. The rules: a single click is
// a draft (the picker stays open, closing applies the day), a second
// click on another day completes the range, and a finished selection
// restarts on the next click.

export interface PeriodDraft {
  from: string;
  to?: string;
}

export interface PeriodDraftResult {
  /** True when the range completed and applies at once. */
  complete: boolean;
  /** The draft the picker shows; null when the calendar emptied. */
  draft: PeriodDraft | null;
}

/** The next draft for one calendar click, given the prior draft. */
export function nextPeriodDraft(
  clicked: { from: string; to?: string } | null,
  prior: PeriodDraft | null
): PeriodDraftResult {
  if (!clicked) {
    return { complete: false, draft: null };
  }
  const priorComplete =
    prior !== null && prior.to !== undefined && prior.to !== prior.from;
  // A finished selection restarts: the clicked day is whichever end of
  // the extension moved (rdp extends, so the from usually stays).
  if (priorComplete) {
    const clickedDay =
      clicked.from === prior.from && clicked.to ? clicked.to : clicked.from;
    return { complete: false, draft: { from: clickedDay } };
  }
  // A single click arrives as a one-day range: a draft, not a selection.
  if (!clicked.to || clicked.to === clicked.from) {
    return { complete: false, draft: { from: clicked.from } };
  }
  // Two different days: the range completed.
  return { complete: true, draft: { from: clicked.from, to: clicked.to } };
}
