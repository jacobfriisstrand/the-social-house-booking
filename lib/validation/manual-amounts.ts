import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the manual-amount form (#16, ADR-0010): the client
// resolver and the server action both parse with it. The amount is whole
// kroner (the room form's convention) and is stored as integer øre
// (ADR-0019); the note is the short explanation the spec requires, and the
// booking id is a seeded-or-generated uuid.

const { errors } = messages.bookings.admin.manualAmounts;

export const addManualAmountSchema = z.object({
  amountKroner: z
    .number({ message: errors.amountInvalid })
    .int(errors.amountInvalid)
    .min(1, errors.amountInvalid),
  // z.guid, not z.uuid: seeded ids are not RFC 4122.
  bookingId: z.guid(),
  note: z
    .string()
    .trim()
    .min(1, errors.noteRequired)
    .max(500, errors.noteTooLong),
});

export type AddManualAmountValues = z.infer<typeof addManualAmountSchema>;
