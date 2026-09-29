import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the notice form (admin, #12): the client resolver and the
// server action both parse with it. The last day is a Copenhagen date or
// empty for "until switched off" (lib/domain/notice.ts turns it into the
// stored end).

const { errors } = messages.notices;

export const noticeFormSchema = z.object({
  body: z.string().trim().min(1, errors.bodyRequired).max(1000, errors.tooLong),
  isActive: z.boolean(),
  lastDay: z.union([z.iso.date(), z.literal("")]),
  // z.guid, not z.uuid: seeded ids are not RFC 4122.
  noticeId: z.guid().optional(),
  title: z
    .string()
    .trim()
    .min(1, errors.titleRequired)
    .max(120, errors.tooLong),
});

export type NoticeFormValues = z.infer<typeof noticeFormSchema>;
