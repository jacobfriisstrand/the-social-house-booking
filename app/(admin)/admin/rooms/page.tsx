import { AdminRoomTable } from "@/components/rooms/admin-room-table";
import { RoomSheet } from "@/components/rooms/room-sheet";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Card } from "@/components/ui/card";
import { listAddons, listRoomDetails } from "@/lib/rooms/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// Lokaler (admin): every room with status and price, sliced by the URL
// pagination. Edit and create open in a sheet on this page (DESIGN.md:
// admin edit in a dialog or a sheet — no dedicated page per entity).
// Deactivated rooms stay listed with a badge — their history is preserved
// (issue #3). The sidebar, footer line and page frame come from the app
// shell (#55).
export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const [rooms, addons] = await Promise.all([
    listRoomDetails(supabase),
    listAddons(supabase),
  ]);

  return (
    <>
      <PageHeader title={messages.rooms.listTitle}>
        <RoomSheet
          addons={addons}
          images={[]}
          initial={null}
          specialDays={[]}
          triggerLabel={messages.rooms.createButton}
          triggerSize="default"
          triggerVariant="default"
        />
      </PageHeader>
      <PagePanel>
        {rooms.length === 0 ? (
          <Card className="py-16">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-medium text-lg">
                {messages.rooms.emptyTitle}
              </h2>
              <p className="text-muted-foreground text-sm">
                {messages.rooms.emptyDescription}
              </p>
            </div>
          </Card>
        ) : (
          <AdminRoomTable addons={addons} rooms={rooms} />
        )}
      </PagePanel>
    </>
  );
}
