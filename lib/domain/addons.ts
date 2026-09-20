// Add-on pricing (#7, ADR-0011): a fixed add-on prices the whole booking
// whatever the headcount (extra screen), a per-participant add-on
// multiplies by the participant count (lunch: 10 × 225 kr = 2 250 kr).
// Add-ons are never discounted (ADR-0007). House Service and House Host
// are plain add-ons (ADR-0015); any guidance lives in the description.
// Pure arithmetic: the booking's frozen totals are synced in Postgres
// (booking_addons_sync_totals); the lines are computed here.

export type AddOnPricingModel = "fixed" | "per_participant";

export interface AddOn {
  addonId: string;
  description: string | null;
  name: string;
  // Catalogue price excl. VAT (ADR-0019, ADR-0020). For House Host this is
  // the base price; a per-booking adjustment replaces the line's unit
  // price, never this value.
  priceOre: number;
  pricingModel: AddOnPricingModel;
}

// One booking_addons row: the unit price written (catalogue price or an
// admin's per-booking adjustment), the quantity the headcount rule
// requires (booking_addons_line_values enforces the same in Postgres), and
// the unit × quantity total.
export interface AddOnLine {
  addonId: string;
  quantity: number;
  totalOre: number;
  unitPriceOre: number;
}

export interface AddOnLineOptions {
  // Per-booking price adjustment (House Host): replaces the catalogue
  // price for this line only. The catalogue keeps its base price, so every
  // new booking still defaults to it (#7).
  overrideUnitPriceOre?: number | null;
}

// The quantity the booking_addons row carries: the participant count for a
// per-participant add-on, 1 for a fixed one.
export function addonQuantity(
  pricingModel: AddOnPricingModel,
  participantCount: number
): number {
  return pricingModel === "per_participant" ? participantCount : 1;
}

export function addonLine(
  addOn: AddOn,
  participantCount: number,
  options: AddOnLineOptions = {}
): AddOnLine {
  const unitPriceOre = options.overrideUnitPriceOre ?? addOn.priceOre;
  const quantity = addonQuantity(addOn.pricingModel, participantCount);
  return {
    addonId: addOn.addonId,
    quantity,
    totalOre: unitPriceOre * quantity,
    unitPriceOre,
  };
}

export function addonLines(
  addOns: AddOn[],
  participantCount: number,
  optionsByAddonId: Map<string, AddOnLineOptions> = new Map()
): AddOnLine[] {
  const lines: AddOnLine[] = [];
  for (const addOn of addOns) {
    lines.push(
      addonLine(addOn, participantCount, optionsByAddonId.get(addOn.addonId))
    );
  }
  return lines;
}

export function linesTotalOre(lines: AddOnLine[]): number {
  let total = 0;
  for (const line of lines) {
    total += line.totalOre;
  }
  return total;
}
