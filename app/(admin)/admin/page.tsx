import { redirect } from "next/navigation";

// /admin redirects to /: one home for everyone, the day grid from #12
// (issue #55).
export default function AdminIndexPage() {
  redirect("/");
}
