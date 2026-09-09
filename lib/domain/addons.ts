export interface AddOn {
  kind: "fixed" | "per_participant";
  name: string;
  priceOre: number;
}

export function addOnTotalOre(addOn: AddOn, participantCount: number): number {
  if (addOn.kind === "fixed") {
    return addOn.priceOre;
  }
  return addOn.priceOre * participantCount;
}

export function totalAddOnsOre(
  addOns: AddOn[],
  participantCount: number
): number {
  let total = 0;
  for (const addOn of addOns) {
    total += addOnTotalOre(addOn, participantCount);
  }
  return total;
}
