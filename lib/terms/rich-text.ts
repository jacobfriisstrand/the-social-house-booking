// The markup rules for the three versioned terms texts (#102). The Tiptap
// editor produces HTML with exactly this schema, the server stores only
// what this schema generates (sanitizeTermsHtml), and the version page
// renders the stored HTML with termsHtmlStyles. A version is never edited,
// so what was accepted is what renders.
import { generateHTML, generateJSON } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";

// The editor's extension set: two heading levels, bold/italic, the two
// list kinds, hard breaks (the converted plain-text versions), and links.
// Everything else in StarterKit is off, so pasted blockquotes, code and
// styling are flattened to schema markup, and the link mark keeps its
// default rel="noopener noreferrer nofollow" and target="_blank" while
// dropping hrefs outside its allowed protocols.
export const termsExtensions = () => [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: { levels: [1, 2] },
    horizontalRule: false,
    link: { openOnClick: false },
    strike: false,
    underline: false,
  }),
];

// Parse and re-serialize with the schema: no script tags, no event
// handlers, no style attributes survive, because nothing outside the
// schema does. Null only if parsing itself breaks; malformed HTML parses
// to whatever the schema can express.
export const sanitizeTermsHtml = (html: string): string | null => {
  try {
    const extensions = termsExtensions();
    return generateHTML(generateJSON(html, extensions), extensions);
  } catch {
    return null;
  }
};

// The visible text of an editor document, for the "not empty" rule: an
// empty Tiptap document serializes to <p></p>, which passes a plain length
// check. ponytail: a tag-stripping read, not an HTML parse — entity
// references count as text, but the editor never produces them, so the
// empty-document rule it enforces is exact.
const TERMS_MARKUP = /<[^>]*>/g;

export const termsHtmlText = (html: string): string =>
  html.replace(TERMS_MARKUP, "").trim();

// What the link dialog accepts before the server sees it. The Link
// extension re-checks every href at parse and render time; this only keeps
// the dialog from applying a link the round trip would strip.
const ALLOWED_TERMS_HREF = /^(https?:\/\/|mailto:|tel:|\/)/i;

export const isAllowedTermsHref = (href: string): boolean =>
  ALLOWED_TERMS_HREF.test(href);

// Typography for schema-generated terms HTML, in the editor and on the
// version page — the same document must look the same in both. Scoped
// selectors, no global CSS.
export const termsHtmlStyles =
  "[&_a]:underline [&_a]:underline-offset-4 [&_h1]:mb-2 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_li>p]:my-0 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";
