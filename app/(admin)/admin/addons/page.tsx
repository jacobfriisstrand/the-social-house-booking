import { AddonSheet } from "@/components/addons/addon-sheet";
import { AddonTable } from "@/components/addons/addon-table";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Card } from "@/components/ui/card";
import { listAddonDetails } from "@/lib/addons/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.addons;

// Tilkøb (admin, #7): the catalogue with the fixed-vs-per-participant
// distinction (ADR-0011) and drag-to-reorder (Rækkefølge column). House
// Service and House Host are plain add-ons, seeded into every environment
// (ADR-0015). The table is a client component so rows can drag; create and
// edit open in a sheet here, and deactivation keeps history (bookings
// reference the add-on by id).
export default async function AdminAddonsPage() {
  const supabase = await createClient();
  const addons = await listAddonDetails(supabase);

  return (
    <>
      <PageHeader title={copy.title}>
        <AddonSheet
          initial={null}
          triggerLabel={copy.createButton}
          triggerSize="default"
          triggerVariant="default"
        />
      </PageHeader>
      <PagePanel>
        {addons.length === 0 ? (
          <Card className="py-16">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-medium text-lg">{copy.emptyTitle}</h2>
              <p className="text-muted-foreground text-sm">
                {copy.emptyDescription}
              </p>
            </div>
          </Card>
        ) : (
          <AddonTable addons={addons} />
        )}
      </PagePanel>
    </>
  );
}
