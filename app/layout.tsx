import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
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

export const metadata: Metadata = {
  description: messages.metadata.description,
  icons: [{ type: "image/svg+xml", url: "/icon.svg" }],
  title: messages.metadata.title,
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
