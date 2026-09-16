import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the room form (admin room create/edit, issue #3): the
// client resolver and the server action both parse with it. Money is entered
// as whole kroner and stored as integer øre (ADR-0019).

// Postgres accepts any 8-4-4-4-12 hex as uuid — zod v4's z.uuid() is
// stricter (rejects version-nibble 0, so seeded IDs fail).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Weekly hours: 0 = Monday … 6 = Sunday. A closed day ignores the times
// (the schema columns are not null, so the form always sends values).
export const openingHourSchema = z.object({
  closes: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opens: z.string().regex(/^\d{2}:\d{2}$/),
});

export const roomFormSchema = z
  .object({
    addonIds: z.array(z.string().regex(UUID_RE)).max(50),
    capacity: z
      .number({ message: messages.rooms.errors.capacityInteger })
      .int(messages.rooms.errors.capacityInteger)
      .min(1, messages.rooms.errors.capacityMin),
    description: z.string().trim().max(5000).optional(),
    hourlyPriceKroner: z
      .number({ message: messages.rooms.errors.priceWholeKroner })
      .int(messages.rooms.errors.priceWholeKroner)
      .min(0, messages.rooms.errors.priceMin),
    isActive: z.boolean(),
    location: z.string().trim().max(100).optional(),
    name: z.string().trim().min(1, messages.rooms.errors.nameMin).max(100),
    openingHours: z.array(openingHourSchema).length(7),
    practicalNotes: z.string().trim().max(2000).optional(),
    roomId: z.string().regex(UUID_RE).optional(),
  })
  .refine(
    (values) =>
      values.openingHours.every(
        (h) => h.isClosed || timeToMinutes(h.closes) > timeToMinutes(h.opens)
      ),
    { error: messages.rooms.errors.closesAfterOpens, path: ["openingHours"] }
  );

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

// One special closing day (lukkedag): a closed day carries no times; an open
// day needs both times, closes after opens (mirrors the check constraint on
// room_special_closing_days).
export const specialClosingDaySchema = z
  .object({
    closes: z.string().regex(/^\d{2}:\d{2}$/),
    date: z.iso.date(),
    isClosed: z.boolean(),
    opens: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine(
    (v) => v.isClosed || timeToMinutes(v.closes) > timeToMinutes(v.opens),
    { error: messages.rooms.errors.closesAfterOpens }
  );

export type SpecialClosingDayValues = z.infer<typeof specialClosingDaySchema>;

// Room images: same limits as the storage bucket (migration
// 20260910170748_room_images_bucket.sql).
export const ROOM_IMAGE_MAX_FILES = 10;
export const ROOM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ROOM_IMAGE_BUCKET = "room-images";

// Server-side schema for pre-uploaded room images (client upload strategy):
// the storage path plus the original file name and byte size, which the
// admin form shows for saved photos. The bucket enforces mime + size; the
// path regex guards against injection.
const STORAGE_PATH_RE =
  /^rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp)$/i;

export const roomImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  path: z.string().regex(STORAGE_PATH_RE),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(ROOM_IMAGE_MAX_BYTES, messages.rooms.errors.imageMaxSize),
});

export const roomImageUploadsSchema = z
  .array(roomImageUploadSchema)
  .max(ROOM_IMAGE_MAX_FILES, messages.rooms.errors.imageMaxCount);

export type RoomImageUpload = z.infer<typeof roomImageUploadSchema>;

// Saved-image display order sent back after a drag-and-drop reorder; the
// action checks it against the room's rows before writing.
export const roomImageOrderSchema = z
  .array(z.string().regex(UUID_RE))
  .min(1)
  .max(ROOM_IMAGE_MAX_FILES);

export function extensionOf(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

export type RoomFormValues = z.infer<typeof roomFormSchema>;
