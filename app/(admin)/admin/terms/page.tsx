import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { TermsForm } from "@/components/terms/terms-form";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TERMS_DOCUMENTS, type TermsDocument } from "@/lib/domain/terms";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTermsVersion, type TermsVersion } from "@/lib/terms/data";
import { messages } from "@/messages/da";

const copy = messages.terms;

export const metadata: Metadata = {
  title: copy.admin.title,
};

interface Editor {
  content: string;
  description: string;
  name: TermsDocument;
  viewHref: string | null;
}

// A text's tab: its current version, or an empty editor before the first.
const toEditor = (name: TermsDocument, current: TermsVersion | null): Editor =>
  current
    ? {
        content: current.content,
        description: copy.version(
          current.version,
          formatDate(current.publishedAt)
        ),
        name,
        viewHref: `/terms/${current.versionId}`,
      }
    : {
        content: "",
        description: copy.admin.notPublished,
        name,
        viewHref: null,
      };

// The link opens the published version the way a booker sees it.
function TermsEditor({ editor }: { editor: Editor }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.documents[editor.name]}</CardTitle>
        <CardDescription>{editor.description}</CardDescription>
        {editor.viewHref ? (
          <CardAction>
            <Link
              className="text-sm underline underline-offset-4"
              href={editor.viewHref}
            >
              {copy.admin.view}
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <TermsForm content={editor.content} name={editor.name} />
      </CardContent>
    </Card>
  );
}

// Betingelser (admin, #15): one tab per text, each with its current
// version and the editor that publishes the next one.
export default async function AdminTermsPage() {
  const supabase = await createClient();
  const editors = await Promise.all(
    TERMS_DOCUMENTS.map(async (name) =>
      toEditor(name, await getCurrentTermsVersion(supabase, name))
    )
  );

  return (
    <>
      <PageHeader title={copy.admin.title} />
      <PagePanel>
        <p className="text-muted-foreground text-sm">
          {copy.admin.description}
        </p>
        <Tabs className="w-full" defaultValue={TERMS_DOCUMENTS[0]}>
          <TabsList>
            {TERMS_DOCUMENTS.map((name) => (
              <TabsTrigger key={name} value={name}>
                {copy.documents[name]}
              </TabsTrigger>
            ))}
          </TabsList>
          {editors.map((editor) => (
            <TabsContent className="pt-4" key={editor.name} value={editor.name}>
              <TermsEditor editor={editor} />
            </TabsContent>
          ))}
        </Tabs>
      </PagePanel>
    </>
  );
}
