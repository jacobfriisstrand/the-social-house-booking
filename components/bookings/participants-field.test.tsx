import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ParticipantsField } from "./participants-field";

function Harness({
  capacity,
  participantCount,
}: {
  capacity: number;
  participantCount: number;
}) {
  const { control } = useForm({
    defaultValues: { participantCount },
  });
  return (
    <ParticipantsField
      capacity={capacity}
      control={control}
      name="participantCount"
    />
  );
}

const markup = (participantCount: number, capacity = 12): string =>
  renderToStaticMarkup(
    <Harness capacity={capacity} participantCount={participantCount} />
  );

describe("ParticipantsField", () => {
  it("shows the headcount in a labelled stepper with the capacity hint", () => {
    const html = markup(8);
    expect(html).toContain('aria-label="Antal deltagere"');
    expect(html).toContain(">8<");
    expect(html).toContain("Maks. 12");
  });

  it("disables the buttons at 1 and at the room capacity", () => {
    // " disabled="", not "data-disabled" or the disabled: classes.
    expect(markup(1, 12).match(/ disabled="/g)).toHaveLength(1);
    expect(markup(12, 12).match(/ disabled="/g)).toHaveLength(1);
    expect(markup(8, 12).match(/ disabled="/g)).toBeNull();
  });
});
