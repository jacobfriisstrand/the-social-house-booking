import { memberPriceOre, roomTotalOre } from "./pricing";

export interface BookingSnapshot {
  addOnsOre: number;
  discountPercent: number;
  hours: number;
  memberPriceOre: number;
  roomHourlyPriceOre: number;
  totalOre: number;
}

export function expectedTotalOre(
  memberPrice: number,
  addOnsOre: number
): number {
  return memberPrice + addOnsOre;
}

export function buildSnapshot(input: {
  roomHourlyPriceOre: number;
  hours: number;
  discountPercent: number;
  addOnsOre: number;
}): BookingSnapshot {
  const roomTotal = roomTotalOre(input.roomHourlyPriceOre, input.hours);
  const member = memberPriceOre(roomTotal, input.discountPercent);
  const total = expectedTotalOre(member, input.addOnsOre);

  return {
    addOnsOre: input.addOnsOre,
    discountPercent: input.discountPercent,
    hours: input.hours,
    memberPriceOre: member,
    roomHourlyPriceOre: input.roomHourlyPriceOre,
    totalOre: total,
  };
}
