import { describe, expect, it } from "vitest";
import { createChangeToken, hashChangeToken } from "./change-token";

describe("change tokens", () => {
  it("creates a raw token and a matching one-way hash", () => {
    const token = createChangeToken();

    expect(token.raw).toHaveLength(43);
    expect(token.hash).toBe(hashChangeToken(token.raw));
    expect(token.hash).not.toContain(token.raw);
  });

  it("does not reuse tokens", () => {
    expect(createChangeToken().raw).not.toBe(createChangeToken().raw);
  });
});
