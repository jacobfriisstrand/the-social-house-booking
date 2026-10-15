import { describe, expect, it } from "vitest";
import { publicHeroImageSchema } from "./settings";

// The schema guards the client-uploaded public hero image (#89): the
// storage path shape is the injection boundary, the byte cap mirrors the
// site-images bucket.
const uuid = "0123456789abcdef0123456789abcdef";

const valid = {
  fileName: "hero.jpg",
  path: `hero/${uuid}.jpg`,
  sizeBytes: 1024,
};

describe("publicHeroImageSchema", () => {
  it("accepts a png, jpeg or webp upload under the hero folder", () => {
    expect(
      publicHeroImageSchema.safeParse({ ...valid, path: `hero/${uuid}.png` })
        .success
    ).toBe(true);
    expect(
      publicHeroImageSchema.safeParse({ ...valid, path: `hero/${uuid}.webp` })
        .success
    ).toBe(true);
    expect(publicHeroImageSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects paths outside the hero folder or with a foreign extension", () => {
    expect(
      publicHeroImageSchema.safeParse({ ...valid, path: `rooms/${uuid}.jpg` })
        .success
    ).toBe(false);
    expect(
      publicHeroImageSchema.safeParse({ ...valid, path: `hero/${uuid}.gif` })
        .success
    ).toBe(false);
    expect(
      publicHeroImageSchema.safeParse({
        ...valid,
        path: "hero/../../etc/passwd",
      }).success
    ).toBe(false);
    expect(
      publicHeroImageSchema.safeParse({ ...valid, path: `hero/${uuid}.jpg ` })
        .success
    ).toBe(false);
  });

  it("rejects oversized files and empty names", () => {
    expect(
      publicHeroImageSchema.safeParse({ ...valid, sizeBytes: 6 * 1024 * 1024 })
        .success
    ).toBe(false);
    expect(
      publicHeroImageSchema.safeParse({ ...valid, fileName: "  " }).success
    ).toBe(false);
  });
});
