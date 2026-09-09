import { describe, expect, it } from "vitest";
import { roundHalfUp } from "./money";

describe("roundHalfUp", () => {
  it("rounds down below 0.5", () => {
    expect(roundHalfUp(2.4)).toBe(2);
  });

  it("rounds up at 0.5", () => {
    expect(roundHalfUp(2.5)).toBe(3);
  });

  it("rounds up above 0.5", () => {
    expect(roundHalfUp(2.6)).toBe(3);
  });

  it("rounds integers to themselves", () => {
    expect(roundHalfUp(3)).toBe(3);
  });
});
