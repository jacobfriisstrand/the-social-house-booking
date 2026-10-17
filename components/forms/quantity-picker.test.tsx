import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuantityPicker } from "./quantity-picker";

const noop = (): void => undefined;

const markup = (value: number, max = 3): string =>
  renderToStaticMarkup(
    <QuantityPicker
      decreaseLabel="Én færre"
      increaseLabel="Én mere"
      label="Antal"
      max={max}
      onValueChange={noop}
      value={value}
    />
  );

describe("QuantityPicker", () => {
  it("renders the value between the buttons in one labelled shell", () => {
    const html = markup(2);
    expect(html).toContain('aria-label="Antal"');
    expect(html).toContain(">2<");
    expect(html.match(/<button /g)).toHaveLength(2);
  });

  it("disables exactly one button at each bound, none between", () => {
    // " disabled="", not "data-disabled" or the disabled: classes.
    expect(markup(1).match(/ disabled="/g)).toHaveLength(1);
    expect(markup(2).match(/ disabled="/g)).toBeNull();
    expect(markup(3).match(/ disabled="/g)).toHaveLength(1);
  });

  it("scales the buttons and the number's text with the size prop", () => {
    const html = renderToStaticMarkup(
      <QuantityPicker
        decreaseLabel="Én færre"
        increaseLabel="Én mere"
        label="Antal"
        max={3}
        onValueChange={noop}
        size="icon"
        value={2}
      />
    );
    expect(html.match(/size-8/g)).toHaveLength(2);
    expect(html).toContain("min-w-8");
    expect(html).toContain("text-base");
  });
});
