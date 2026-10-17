import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { HeroImageForm } from "@/components/settings/hero-image-form";
import { WifiForm } from "@/components/settings/wifi-form";
import { PageHeader, PagePanel } from "@/components/shell/page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPublicHeroImage,
  getWifiSettings,
  publicHeroImageUrl,
} from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const labels = messages.settings;

export const metadata: Metadata = {
  title: labels.title,
};

// Indstillinger (admin): the Wi-Fi credentials the shell footer shows and
// the public split-screen's hero image (#89). The single-row settings table
// and the site_images table back the forms; saving revalidates the whole
// shell (DESIGN.md, footer line).
export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [wifi, heroPath] = await Promise.all([
    getWifiSettings(supabase),
    getPublicHeroImage(supabase),
  ]);

  return (
    <>
      <PageHeader title={labels.title} />
      <PagePanel>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{labels.passwordSection}</CardTitle>
            <CardDescription>{labels.passwordDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
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
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{labels.heroImageSection}</CardTitle>
          </CardHeader>
          <CardContent>
            <HeroImageForm
              currentUrl={
                heroPath ? publicHeroImageUrl(supabase, heroPath) : null
              }
            />
          </CardContent>
        </Card>
      </PagePanel>
    </>
  );
}
