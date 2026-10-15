// The texts The Social House versions (#15, Bilag 1 "Booking terms and
// personal data") and the rules over their versions. A version is never
// edited: each save publishes the next one, so an acceptance always
// points at the exact text the booker was shown.

// terms_versions.terms_version_name, one per text.
export const TERMS_DOCUMENTS = [
  "Booking terms",
  "Privacy policy",
  "GDPR overview",
] as const;

export type TermsDocument = (typeof TERMS_DOCUMENTS)[number];

// What the booker confirms on "Book nu": the booking and cancellation
// terms, and that they have read the privacy policy.
export const ACCEPTED_ON_BOOKING: readonly TermsDocument[] = [
  "Booking terms",
  "Privacy policy",
];

export interface PublishedTermsVersion {
  name: string;
  versionId: string;
}

// The current published version id of each text; a text never published
// is missing. What the booking dialog links and sends back.
export type CurrentTerms = Partial<Record<TermsDocument, string>>;

export const isTermsDocument = (name: string): name is TermsDocument =>
  (TERMS_DOCUMENTS as readonly string[]).includes(name);

// From published versions newest first: the first of each text wins.
export const currentVersionIds = (
  newestFirst: readonly PublishedTermsVersion[]
): CurrentTerms => {
  const current: CurrentTerms = {};
  for (const { name, versionId } of newestFirst) {
    if (isTermsDocument(name)) {
      current[name] ??= versionId;
    }
  }
  return current;
};

// The versions to record for a booking, in ACCEPTED_ON_BOOKING order, or
// null when what the dialog showed is not exactly one published version of
// each accepted text. An older published version counts: the record is of
// what was shown, even when admin published a newer one meanwhile.
export const acceptedVersionIds = (
  shownIds: readonly string[],
  published: readonly PublishedTermsVersion[]
): string[] | null => {
  const shown = new Set(shownIds);
  if (shown.size !== ACCEPTED_ON_BOOKING.length) {
    return null;
  }
  const ids: string[] = [];
  for (const document of ACCEPTED_ON_BOOKING) {
    const match = published.find(
      (version) => version.name === document && shown.has(version.versionId)
    );
    if (!match) {
      return null;
    }
    ids.push(match.versionId);
  }
  return ids;
};

// Versions are whole numbers stored as text, counted per text from 1.
export const nextTermsVersion = (latest: string | null): string =>
  String((latest === null ? 0 : Number.parseInt(latest, 10)) + 1);
