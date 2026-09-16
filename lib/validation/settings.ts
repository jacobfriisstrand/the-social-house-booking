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
