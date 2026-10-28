import Link from "next/link";

// A terms text opens as its own page in a new tab: the booker keeps the
// dialog state while reading (booking dialog #15). Unlinked while the text
// has no published version; the server then refuses the booking.
export function TermsLink({
  children,
  versionId,
}: {
  children: string;
  versionId: string | undefined;
}) {
  if (!versionId) {
    return children;
  }
  return (
    <Link
      className="underline underline-offset-4"
      href={`/terms/${versionId}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </Link>
  );
}
