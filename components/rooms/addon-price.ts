import { formatKroner } from "@/lib/format";
import { messages } from "@/messages/da";

interface PricedAddon {
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

// Price chip text (DESIGN.md room detail): "+ 35 kr", "Gratis",
// "+ 200 kr / person".
export function formatAddonPrice(addon: PricedAddon): string {
  if (addon.priceOre === 0) {
    return messages.booking.dialog.addonFree;
  }
  const price = `+ ${formatKroner(addon.priceOre)}`;
  return addon.pricingModel === "per_participant"
    ? `${price} ${messages.rooms.perParticipantSuffix}`
    : price;
}
