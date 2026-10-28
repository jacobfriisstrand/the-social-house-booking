import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TermsVersion } from "@/lib/terms/data";
import { TermsDialogLink } from "./terms-dialog-link";

const published: TermsVersion = {
  content: "<h1>Handelsbetingelser</h1><p>§ 1.</p>",
  name: "Terms of trade",
  publishedAt: "2026-10-16T12:00:00.000Z",
  version: "1",
  versionId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
};

const markup = (version: TermsVersion | null, text = "handelsbetingelserne") =>
  renderToStaticMarkup(
    <TermsDialogLink version={version}>{text}</TermsDialogLink>
  );

describe("TermsDialogLink", () => {
  it("renders a button trigger instead of a page link when published", () => {
    const html = markup(published);
    // A button, not a page link: the reader stays on the form. Base UI
    // renders the dialog itself only once it is open, so the content is
    // verified in the browser, not in static markup.
    expect(html).toContain('type="button"');
    expect(html).not.toContain("<a ");
    expect(html).toContain("handelsbetingelserne");
  });

  it("renders plain text while the text has no published version", () => {
    const html = markup(null);
    expect(html).toBe("handelsbetingelserne");
  });
});
