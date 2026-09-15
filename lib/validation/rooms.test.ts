import { describe, expect, it } from "vitest";
import {
  extensionOf,
  ROOM_IMAGE_MAX_BYTES,
  roomFormSchema,
  roomImageUploadsSchema,
} from "./rooms";

// The columns are Postgres uuid; seeded rows carry ids with version nibble
// 0 (00000000-…) that zod v4's z.uuid() rejects. The schema must accept any
// 8-4-4-4-12 hex the database does (#3).
describe("roomFormSchema id validation", () => {
  it("accepts a seeded all-zero room id", () => {
    const result = roomFormSchema.safeParse({
      addonIds: [],
      capacity: 10,
      hourlyPriceKroner: 100,
      isActive: true,
      name: "Room of Art",
      openingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        closes: "18:00",
        dayOfWeek,
        isClosed: dayOfWeek === 6,
        opens: "08:00",
      })),
      roomId: "00000000-0000-0000-0000-0000000000c2",
    });
    expect(result.success).toBe(true);
  });

  it("accepts seeded all-zero addon ids", () => {
    const result = roomFormSchema.safeParse({
      addonIds: ["00000000-0000-0000-0000-0000000000d1"],
      capacity: 10,
      hourlyPriceKroner: 100,
      isActive: true,
      name: "Room of Art",
      openingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        closes: "18:00",
        dayOfWeek,
        isClosed: dayOfWeek === 6,
        opens: "08:00",
      })),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed id", () => {
    const result = roomFormSchema.safeParse({
      addonIds: [],
      capacity: 10,
      hourlyPriceKroner: 100,
      isActive: true,
      name: "Room of Art",
      openingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        closes: "18:00",
        dayOfWeek,
        isClosed: dayOfWeek === 6,
        opens: "08:00",
      })),
      roomId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("roomImageUploadsSchema", () => {
  const baseImage = {
    fileName: "møde.jpg",
    path: "rooms/00000000-0000-0000-0000-0000000000c2/87654321-0000-0000-0000-000000000000.jpg",
    sizeBytes: 1024,
  };

  it("accepts a path under a room with a valid suffix", () => {
    const result = roomImageUploadsSchema.safeParse([baseImage]);
    expect(result.success).toBe(true);
  });

  it("accepts webp and png suffixes", () => {
    for (const suffix of ["png", "webp", "jpeg"]) {
      const result = roomImageUploadsSchema.safeParse([
        {
          ...baseImage,
          path: `rooms/00000000-0000-0000-0000-0000000000c2/87654321-0000-0000-0000-000000000000.${suffix}`,
        },
      ]);
      expect(result.success).toBe(true);
    }
  });

  it("rejects paths outside rooms/", () => {
    const result = roomImageUploadsSchema.safeParse([
      {
        ...baseImage,
        path: "attachments/87654321-0000-0000-0000-000000000000.gif",
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects oversized files", () => {
    const result = roomImageUploadsSchema.safeParse([
      { ...baseImage, sizeBytes: ROOM_IMAGE_MAX_BYTES + 1 },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects a blank file name", () => {
    const result = roomImageUploadsSchema.safeParse([
      { ...baseImage, fileName: "  " },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("extensionOf", () => {
  it("maps png, webp and defaults to jpg", () => {
    expect(extensionOf("image/png")).toBe("png");
    expect(extensionOf("image/webp")).toBe("webp");
    expect(extensionOf("image/jpeg")).toBe("jpg");
  });
});
