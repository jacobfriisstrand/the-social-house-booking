import { describe, expect, it } from "vitest";
import { companyChangeCompleted } from "./company-change-completed";
import { companyChangeNewEmail } from "./company-change-new-email";
import { companyChangeReview } from "./company-change-review";
import { passwordReset } from "./password-reset";

const templates = [
  companyChangeCompleted,
  companyChangeNewEmail,
  companyChangeReview,
  passwordReset,
];

describe("#70 email templates", () => {
  it("use the shared visual shell", () => {
    for (const template of templates) {
      expect(template.html).toContain("THE SOCIAL HOUSE");
      expect(template.html).toContain("#faf8f2");
      expect(template.html).toContain("Our house is your stage.");
    }
  });

  it("keeps one clear CTA in each actionable template", () => {
    expect(
      passwordReset.html.match(/href="\{\{\{ACTION_URL\}\}\}/g)
    ).toHaveLength(1);
    expect(
      companyChangeReview.html.match(/href="\{\{\{ACTION_URL\}\}\}/g)
    ).toHaveLength(1);
    expect(
      companyChangeNewEmail.html.match(/href="\{\{\{ACTION_URL\}\}\}/g)
    ).toHaveLength(1);
    expect(companyChangeCompleted.html).not.toContain("ACTION_URL");
  });
});
