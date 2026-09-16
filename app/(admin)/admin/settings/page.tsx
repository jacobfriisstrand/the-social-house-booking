import { WifiForm } from "@/components/settings/wifi-form";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWifiSettings } from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const labels = messages.settings;

// Indstillinger (admin): the Wi-Fi credentials the shell footer shows. The
// single-row settings table backs the form; saving revalidates the whole
// shell (DESIGN.md, footer line).
export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const wifi = await getWifiSettings(supabase);

  return (
    <>
      <PageHeader title={labels.title} />
      <PagePanel>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{labels.wifiSection}</CardTitle>
          </CardHeader>
          <CardContent>
            <WifiForm
              defaultValues={{
                wifiNetwork: wifi.network,
                wifiPassword: wifi.password,
              }}
            />
          </CardContent>
        </Card>
      </PagePanel>
    </>
  );
}
