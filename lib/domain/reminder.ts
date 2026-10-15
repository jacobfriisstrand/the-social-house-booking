// The 24-hour reminder window (#11, Bilag 1 "E-mails", docs/agents/email.md
// "The hourly job"): each run reminds the confirmed bookings that start
// within the next 24 hours and have no reminder logged yet. A booking
// enters the window exactly 24 hours before it starts, so hourly runs send
// its reminder within the first hour after that mark; the once-only index
// on outbound_emails keeps every booking at one reminder even when the
// booking was created inside the window or a run was missed. Real elapsed
// hours, so a DST change in between does not shift the window.
const HOUR_MS = 3_600_000;

export interface ReminderWindow {
  after: Date;
  until: Date;
}

export function reminderWindow(now: Date): ReminderWindow {
  return {
    after: now,
    until: new Date(now.getTime() + 24 * HOUR_MS),
  };
}
