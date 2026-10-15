import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { isDevelopment } from "@/lib/env";
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

// [DEV] prefix in development so two open environments are tellable apart
// (#65). The template carries it onto every page's own title; the default
// covers pages without one. Emails keep the plain name (they go to a
// single environment).
export const metadata: Metadata = {
  description: messages.metadata.description,
  icons: [{ type: "image/svg+xml", url: "/icon.svg" }],
  title: {
    default: isDevelopment
      ? `[DEV] ${messages.metadata.title}`
      : messages.metadata.title,
    template: isDevelopment ? "[DEV] %s" : "%s",
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
