// Read-side for the booking terms, privacy policy, and GDPR overview (#15).
// Session client + RLS: members read published versions only; admins read
// drafts too, so every read here filters on published to give both the
// same texts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  type CurrentTerms,
  currentVersionIds,
  isTermsDocument,
  type PublishedTermsVersion,
  type TermsDocument,
} from "@/lib/domain/terms";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Client = SupabaseClient<Database>;

export interface TermsVersion {
  content: string;
  name: TermsDocument;
  publishedAt: string;
  version: string;
  versionId: string;
}

const VERSION_COLUMNS =
  "terms_version_content, terms_version_id, terms_version_name, terms_version_published_at, terms_version_version";

type VersionRow = Pick<
  Database["public"]["Tables"]["terms_versions"]["Row"],
  | "terms_version_content"
  | "terms_version_id"
  | "terms_version_name"
  | "terms_version_published_at"
  | "terms_version_version"
>;

const toPublished = (
  row: Pick<VersionRow, "terms_version_id" | "terms_version_name">
): PublishedTermsVersion => ({
  name: row.terms_version_name,
  versionId: row.terms_version_id,
});

const toVersion = (row: VersionRow): TermsVersion | null =>
  isTermsDocument(row.terms_version_name) && row.terms_version_published_at
    ? {
        content: row.terms_version_content,
        name: row.terms_version_name,
        publishedAt: row.terms_version_published_at,
        version: row.terms_version_version,
        versionId: row.terms_version_id,
      }
    : null;

// One published version by id: the page a terms link opens. Null for a
// draft, a made-up id, or an id that is not a guid.
export async function getTermsVersion(
  supabase: Client,
  versionId: string
): Promise<TermsVersion | null> {
  const { data } = await supabase
    .from("terms_versions")
    .select(VERSION_COLUMNS)
    .eq("terms_version_id", versionId)
    .not("terms_version_published_at", "is", null)
    .maybeSingle();
  return data ? toVersion(data) : null;
}

// The latest published version of one text, with its content: the admin
// editor starts from it.
export async function getCurrentTermsVersion(
  supabase: Client,
  name: TermsDocument
): Promise<TermsVersion | null> {
  const { data, error } = await supabase
    .from("terms_versions")
    .select(VERSION_COLUMNS)
    .eq("terms_version_name", name)
    .not("terms_version_published_at", "is", null)
    .order("terms_version_published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`could not read the current ${name}: ${error.message}`);
  }
  return data ? toVersion(data) : null;
}

// The current version id of every text, without the content. React
// cache(): the shell footer (layout) and the booking dialog or settings
// card (page) share one read per request, as requireSession does.
export const getCurrentTerms = cache(async (): Promise<CurrentTerms> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms_versions")
    .select("terms_version_id, terms_version_name")
    .not("terms_version_published_at", "is", null)
    .order("terms_version_published_at", { ascending: false })
    // Bounded: a few versions a year per text.
    .limit(500);
  if (error) {
    throw new Error(`could not list the current terms: ${error.message}`);
  }
  return currentVersionIds(data.map(toPublished));
});

// The published versions among the ids a booking dialog sent back. A
// failed read finds none, so the booking is refused rather than recorded
// without its terms.
export async function findPublishedVersions(
  supabase: Client,
  versionIds: readonly string[]
): Promise<PublishedTermsVersion[]> {
  const { data } = await supabase
    .from("terms_versions")
    .select("terms_version_id, terms_version_name")
    .in("terms_version_id", [...versionIds])
    .not("terms_version_published_at", "is", null);
  return (data ?? []).map(toPublished);
}
