// #119: the quantity stepper for a per-participant add-on. A checked row
// shows the stepper beside the label and reads the participant count as a
// display fallback while untouched — the field stays unwritten, so the
// server prices the line at the full headcount. Fixed add-ons and
// unchecked rows show no stepper.
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { AddOnView } from "./addon-selection";
import { AddOnCheckboxList } from "./addon-selection";

const lunch: AddOnView = {
  addonId: "00000000-0000-0000-0000-0000000000a1",
  description: null,
  name: "Frokost",
  priceOre: 22_500,
  pricingModel: "per_participant",
};
const host: AddOnView = {
  addonId: "00000000-0000-0000-0000-0000000000a2",
  description: null,
  name: "House Host",
  priceOre: 50_000,
  pricingModel: "fixed",
};

function Harness({ selectedIds }: { selectedIds: string[] }) {
  const { control } = useForm({
    defaultValues: {
      addOnIds: selectedIds,
      addOnQuantities: {} as Record<string, number>,
      participantCount: 8,
    },
  });
  return (
    <AddOnCheckboxList
      addOns={[host, lunch]}
      control={control}
      name="addOnIds"
      participantsName="participantCount"
    />
  );
}

const markup = (selectedIds: string[]): string =>
  renderToStaticMarkup(<Harness selectedIds={selectedIds} />);

describe("AddOnCheckboxList quantity stepper", () => {
  it("shows the participant count while the stepper is untouched", () => {
    const html = markup([lunch.addonId]);
    expect(html).toContain('aria-label="Antal"');
    expect(html).toContain(">8<");
  });

  it("renders one stepper per checked per-participant add-on, none for fixed ones", () => {
    const html = markup([host.addonId, lunch.addonId]);
    expect(html.match(/aria-label="Antal"/g)).toHaveLength(1);
  });

  it("renders no stepper while nothing is checked", () => {
    expect(markup([])).not.toContain('aria-label="Antal"');
  });
});
