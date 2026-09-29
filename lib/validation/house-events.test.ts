import { describe, expect, it } from "vitest";
import { messages } from "@/messages/da";
import { houseEventFormSchema } from "./house-events";

const valid = {
  date: "2026-10-01",
  description: "The Loft bruges til 3 Days of Design.",
  endTime: "14:00",
  roomIds: ["00000000-0000-0000-0000-0000000000c2"],
  startTime: "12:00",
  title: "",
};

const errorsOf = (values: Record<string, unknown>) => {
  const result = houseEventFormSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

describe("houseEventFormSchema", () => {
  it("accepts an event without a title on a seeded room id", () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it("refuses an end that is not after the start", () => {
    expect(errorsOf({ ...valid, endTime: "12:00" })).toEqual([
      messages.houseEvents.errors.endAfterStart,
    ]);
  });

  it("refuses an event without rooms", () => {
    expect(errorsOf({ ...valid, roomIds: [] })).toEqual([
      messages.houseEvents.errors.roomsRequired,
    ]);
  });

  it("refuses an empty explanation", () => {
    expect(errorsOf({ ...valid, description: "  " })).toEqual([
      messages.houseEvents.errors.descriptionRequired,
    ]);
  });
});
