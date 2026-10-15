import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, PagePanel } from "@/components/shell/page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getTermsVersion } from "@/lib/terms/data";
import { termsHtmlStyles } from "@/lib/terms/rich-text";
import { messages } from "@/messages/da";

const copy = messages.terms;

export const metadata: Metadata = {
  title: copy.member.title,
};

// One published version of a text (#15): what the terms links in the
// booking dialog open, by id, so the booker reads exactly the version that
// is recorded. The content is the editor's schema-generated HTML (#102);
// sanitizeTermsHtml keeps anything else out of the column, so rendering it
// as HTML is safe, and the styles match the editor's.
export default async function TermsVersionPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const version = await getTermsVersion(await createClient(), versionId);
  if (!version) {
    notFound();
  }

  return (
    <>
      <PageHeader title={copy.documents[version.name]} />
      <PagePanel>
        {/* shrink-0: the panel is a fixed-height scrolling column; a card
            that shrinks to fit it clips a long text instead of scrolling. */}
        <Card className="shrink-0">
          <CardHeader>
            <CardDescription>
              {copy.version(version.version, formatDate(version.publishedAt))}
            </CardDescription>
          </CardHeader>
          <CardContent className={termsHtmlStyles}>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the column keeps only what the terms schema generates (lib/terms/rich-text.ts), so the markup is the format, not untrusted input. */}
            <div dangerouslySetInnerHTML={{ __html: version.content }} />
          </CardContent>
        </Card>
      </PagePanel>
    </>
  );
}
