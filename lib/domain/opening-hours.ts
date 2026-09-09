import { cphWallClock } from "./time";

function isWithin(
  wallHour: number,
  wallMinute: number,
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number
): boolean {
  if (wallHour < openHour) {
    return false;
  }
  if (wallHour > closeHour) {
    return false;
  }
  if (wallHour === openHour && wallMinute < openMinute) {
    return false;
  }
  if (wallHour === closeHour && wallMinute > closeMinute) {
    return false;
  }
  return true;
}

export function bookingWithinHours(
  startAt: Date,
  endAt: Date,
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number
): boolean {
  const startCph = cphWallClock(startAt);
  const endCph = cphWallClock(endAt);
  return (
    isWithin(
      startCph.hour,
      startCph.minute,
      openHour,
      openMinute,
      closeHour,
      closeMinute
    ) &&
    isWithin(
      endCph.hour,
      endCph.minute,
      openHour,
      openMinute,
      closeHour,
      closeMinute
    )
  );
}
