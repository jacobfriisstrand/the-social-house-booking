import { describe, expect, it } from "vitest";
import { emailTemplates } from "./registry";

describe("email templates", () => {
  it("do not render images", () => {
    for (const template of Object.values(emailTemplates)) {
      expect(template.html).not.toContain("<img");
    }
  });
});
