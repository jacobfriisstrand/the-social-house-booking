import { z } from "zod";
import { messages } from "@/messages/da";

// The settings form backs the single-row site settings table (the Wi-Fi
// credentials the shell footer shows). Bounds follow Wi-Fi reality: an SSID
// is at most 32 characters, a WPA password at most 63.

const { errors } = messages.settings;

export const settingsSchema = z.object({
  wifiNetwork: z
    .string()
    .trim()
    .min(1, errors.required)
    .max(32, errors.wifiNetworkMax),
  wifiPassword: z
    .string()
    .trim()
    .min(1, errors.required)
    .max(63, errors.wifiPasswordMax),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

// The public split-screen hero image (#89): an admin upload into the
// site-images bucket, mirrored by the site_images row the public layout
// reads. Same limits as the bucket (mirrors room-images' schema): the
// bucket enforces mime + size; the path regex is the injection boundary.
export const SITE_IMAGE_BUCKET = "site-images";
export const SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const SITE_IMAGE_PATH_RE = /^hero\/[0-9a-f]{32}\.(png|jpe?g|webp)$/i;

export const publicHeroImageSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  path: z.string().regex(SITE_IMAGE_PATH_RE),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(SITE_IMAGE_MAX_BYTES, messages.settings.errors.imageMaxSize),
});

export type PublicHeroImageValues = z.infer<typeof publicHeroImageSchema>;
