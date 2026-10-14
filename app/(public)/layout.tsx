// Split-screen shell for every page without the sidebar (#89): the house
// brand top left, the page centred in the left half, a full-height photo
// filling the right half from lg. The demo at app/demo/forms deliberately
// sits outside this group to keep its own form-reference shell.
import Image from "next/image";
import { messages } from "@/messages/da";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 p-4">
          <Image
            alt="The Social House"
            height={28}
            priority
            src="/logo-mark.svg"
            unoptimized
            width={28}
          />
          {/* Same treatment as the sidebar header: the image's alt names
              the brand, so the text is hidden from screen readers. */}
          <span
            aria-hidden="true"
            className="font-semibold text-muted-foreground text-xl"
          >
            {messages.shell.brand}
          </span>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          {children}
        </main>
      </div>
      {/* Sticky so a page taller than the viewport (the company-change
          review) keeps the photo pinned while its content scrolls. */}
      <div className="sticky top-0 hidden h-dvh w-1/2 self-start lg:block">
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={640}
          priority
          sizes="50vw"
          src="/hero.jpg"
          width={960}
        />
      </div>
    </div>
  );
}
