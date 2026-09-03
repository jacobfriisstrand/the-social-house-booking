import type { MetadataRoute } from "next";
import { messages } from "@/messages/da";

// Add to home screen (spec: Mobile and user experience). Icon: the logo mark on a white ground (docs/design/DESIGN.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    description: messages.metadata.description,
    display: "standalone",
    icons: [
      { purpose: "any", sizes: "any", src: "/icon.svg", type: "image/svg+xml" },
      {
        purpose: "maskable",
        sizes: "any",
        src: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    name: messages.manifest.name,
    short_name: messages.manifest.shortName,
    start_url: "/",
    theme_color: "#ffffff",
  };
}
