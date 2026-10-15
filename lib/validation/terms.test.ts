import { describe, expect, it } from "vitest";
import { TERMS_DOCUMENTS } from "@/lib/domain/terms";
import { messages } from "@/messages/da";
import { termsFormSchema } from "./terms";

// The content is the editor's schema-generated HTML (#102): the cap counts
// HTML, and a document without text (<p></p>) is empty.
const { contentRequired, tooLong } = messages.terms.admin.errors;
const [name] = TERMS_DOCUMENTS;

describe("termsFormSchema content", () => {
  it("accepts a schema-generated document", () => {
    const result = termsFormSchema.safeParse({
      content:
        '<h1>Betingelser</h1><p>Læs <strong>alt</strong> teksten.</p><ul><li>Punkt</li></ul><p><a href="https://thesocialhouse.dk" target="_blank" rel="noopener noreferrer nofollow">Hjem</a></p>',
      name,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty editor document", () => {
    const result = termsFormSchema.safeParse({ content: "<p></p>", name });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(contentRequired);
    }
  });

  it("rejects a document with no text", () => {
    expect(
      termsFormSchema.safeParse({ content: "<h1></h1><p><br></p>", name })
        .success
    ).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(termsFormSchema.safeParse({ content: "", name }).success).toBe(
      false
    );
  });

  it("rejects HTML over the cap", () => {
    const content = `<p>${"a".repeat(100_001)}</p>`;
    const result = termsFormSchema.safeParse({ content, name });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(tooLong);
    }
  });

  it("accepts HTML at the cap", () => {
    const content = `<p>${"a".repeat(99_990)}</p>`;
    expect(termsFormSchema.safeParse({ content, name }).success).toBe(true);
  });

  it("rejects an unknown document name", () => {
    expect(
      termsFormSchema.safeParse({ content: "<p>Hej</p>", name: "House rules" })
        .success
    ).toBe(false);
  });
});
