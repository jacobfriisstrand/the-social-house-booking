import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { env } from "@/lib/env";
import { messages } from "@/messages/da";
import "./globals.css";

const fontSans = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// The browser tab names its runtime (#65): the site name as suffix on
// every page, with a prefix so two open environments are tellable apart —
// [DEV] on the development deployment (branch-deploy, PR previews) and
// [LOCAL] on the developer machine; production gets no prefix. The
// template carries both onto every page's own title; the default covers
// pages without one. Emails keep the plain name (they go to a single
// environment).
const titlePrefix = {
  development: "[DEV] ",
  local: "[LOCAL] ",
  production: "",
}[env.APP_ENV];

export const metadata: Metadata = {
  description: messages.metadata.description,
  icons: [{ type: "image/svg+xml", url: "/icon.svg" }],
  title: {
    // No suffix on the default: its title already is the brand.
    default: `${titlePrefix}${messages.metadata.title}`,
    template: `${titlePrefix}%s • ${messages.metadata.titleSuffix}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on <html> so the base-layer `html { @apply font-sans }` resolves.
    <html className={`${fontSans.variable} ${fontMono.variable}`} lang="da">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
