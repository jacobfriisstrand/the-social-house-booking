import { cphWallClock } from "./time";

const BUFFER_MINUTES = 30;

export function bufferEndAt(bookingEndAt: Date): Date {
  return new Date(bookingEndAt.getTime() + BUFFER_MINUTES * 60 * 1000);
}

export function fitsWithinClosingTime(
  bufferEnd: Date,
  closingHour: number,
  closingMinute: number
): boolean {
  const cph = cphWallClock(bufferEnd);
  if (cph.hour < closingHour) {
    return true;
  }
  if (cph.hour > closingHour) {
    return false;
  }
  return cph.minute <= closingMinute;
}
