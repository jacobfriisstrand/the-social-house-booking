import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the House Event form (admin, #12): the client resolver and
// the server action both parse with it. Date and times are Copenhagen wall
// clock (ADR-0021); the action turns them into instants. "HH:mm" strings
// compare in time order, so the end check needs no parsing.

const { errors } = messages.houseEvents;

const wallClock = z.string().regex(/^\d{2}:\d{2}$/, errors.timeRequired);

export const houseEventFormSchema = z
  .object({
    date: z.iso.date({ message: errors.dateRequired }),
    description: z
      .string()
      .trim()
      .min(1, errors.descriptionRequired)
      .max(500, errors.tooLong),
    endTime: wallClock,
    // z.guid, not z.uuid: seeded ids are not RFC 4122.
    houseEventId: z.guid().optional(),
    roomIds: z.array(z.guid()).min(1, errors.roomsRequired),
    startTime: wallClock,
    title: z.string().trim().max(120, errors.tooLong),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: errors.endAfterStart,
    path: ["endTime"],
  });

export type HouseEventFormValues = z.infer<typeof houseEventFormSchema>;
