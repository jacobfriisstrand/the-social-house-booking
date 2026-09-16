// Reads the sidebar collapse state (issue #55): the shadcn sidebar block
// persists it in this cookie, and the layouts seed the provider's
// defaultOpen from it so a collapsed sidebar does not flash open.
import { cookies } from "next/headers";
import { SIDEBAR_COOKIE_NAME } from "@/components/ui/sidebar";

export async function sidebarDefaultOpen(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";
}
