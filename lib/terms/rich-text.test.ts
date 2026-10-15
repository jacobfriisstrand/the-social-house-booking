import { describe, expect, it } from "vitest";
import {
  isAllowedTermsHref,
  sanitizeTermsHtml,
  termsHtmlText,
} from "./rich-text";

// The stored versions are read by members, so the server keeps only what
// the terms editor can produce: the round trip parses submitted HTML with
// the editor's schema and serializes it back (#102).
describe("sanitizeTermsHtml", () => {
  it("keeps the toolbar markup", () => {
    const html =
      "<h1>Vilkår</h1><h2>Priser</h2><p><strong>Fed</strong> og <em>kursiv</em></p><ul><li>Punkt</li></ul><ol><li>Et</li></ol>";
    expect(sanitizeTermsHtml(html)).toBe(
      "<h1>Vilkår</h1><h2>Priser</h2><p><strong>Fed</strong> og <em>kursiv</em></p><ul><li><p>Punkt</p></li></ul><ol><li><p>Et</p></li></ol>"
    );
  });

  it("round trips a converted plain-text version unchanged", () => {
    const html = "<p>Linje en<br>Linje to<br><br>Linje tre</p>";
    expect(sanitizeTermsHtml(html)).toBe(html);
  });

  it("drops script tags, event handlers and style attributes", () => {
    const html =
      '<p>Hej<script>alert(1)</script><img src="x" onerror="alert(1)"></p><p style="color:red" onclick="alert(1)">Verden</p>';
    const sanitized = sanitizeTermsHtml(html) ?? "";
    expect(sanitized).not.toContain("alert");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("style=");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("Hej");
    expect(sanitized).toContain("Verden");
  });

  it("drops links with a disallowed href and keeps their text", () => {
    expect(
      sanitizeTermsHtml('<p><a href="javascript:alert(1)">Surf</a></p>')
    ).toBe("<p>Surf</p>");
  });

  it("stamps allowed links with target and rel", () => {
    const sanitized =
      sanitizeTermsHtml(
        '<p><a href="https://thesocialhouse.dk">Hjem</a></p>'
      ) ?? "";
    expect(sanitized).toContain('href="https://thesocialhouse.dk"');
    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer nofollow"');
  });

  it("demotes headings outside the two levels to text", () => {
    expect(sanitizeTermsHtml("<h3>For mange</h3>")).toBe("<p>For mange</p>");
  });

  it("strips markup outside the terms schema", () => {
    const sanitized =
      sanitizeTermsHtml(
        "<blockquote><p>Citat</p></blockquote><pre><code>x = 1</code></pre>"
      ) ?? "";
    expect(sanitized).not.toContain("<blockquote");
    expect(sanitized).not.toContain("<code");
    expect(sanitized).toContain("Citat");
    expect(sanitized).toContain("x = 1");
  });

  it("stays stable when sanitized twice", () => {
    const html =
      '<h2>Aftale</h2><p>Se <a href="https://tsh.dk">vilkår</a>.</p><ul><li>Et</li></ul>';
    const once = sanitizeTermsHtml(html);
    expect(sanitizeTermsHtml(once ?? "")).toBe(once);
  });
});

// The "not empty" rule counts text, not markup: an empty Tiptap document is
// <p></p> and would pass a plain length check.
describe("termsHtmlText", () => {
  it("reads the text of a document", () => {
    expect(termsHtmlText("<h1>Vilkår</h1><p>Linje<br>to</p>")).toBe(
      "VilkårLinjeto"
    );
  });

  it("is empty for the empty editor document", () => {
    expect(termsHtmlText("<p></p>")).toBe("");
    expect(termsHtmlText("<h1></h1><p></p>")).toBe("");
  });
});

describe("isAllowedTermsHref", () => {
  it("allows web, mail, phone and relative addresses", () => {
    expect(isAllowedTermsHref("https://thesocialhouse.dk/betingelser")).toBe(
      true
    );
    expect(isAllowedTermsHref("http://thesocialhouse.dk")).toBe(true);
    expect(isAllowedTermsHref("mailto:info@thesocialhouse.dk")).toBe(true);
    expect(isAllowedTermsHref("tel:+4512345678")).toBe(true);
    expect(isAllowedTermsHref("/priser")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAllowedTermsHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedTermsHref("data:text/html,hej")).toBe(false);
    expect(isAllowedTermsHref("hej")).toBe(false);
  });
});
