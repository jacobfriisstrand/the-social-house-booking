// The 24-hour reminder window (#11, Bilag 1 "E-mails", docs/agents/email.md
// "The hourly job"): each run reminds the confirmed bookings that start in
// (now + 23h, now + 24h]. Runs an hour apart tile the timeline, so a booking
// falls in exactly one run; the once-only index on outbound_emails absorbs
// the overlap when a run is late. Real elapsed hours, so a DST change in
// between does not shift the window.
const HOUR_MS = 3_600_000;

export interface ReminderWindow {
  after: Date;
  until: Date;
}

export function reminderWindow(now: Date): ReminderWindow {
  return {
    after: new Date(now.getTime() + 23 * HOUR_MS),
    until: new Date(now.getTime() + 24 * HOUR_MS),
  };
}
