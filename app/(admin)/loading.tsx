import { PageLoading } from "@/components/shell/page";

// Shown at once on navigation while the page's server data loads; the
// layout (shell) stays.
export default function Loading() {
  return <PageLoading />;
}
