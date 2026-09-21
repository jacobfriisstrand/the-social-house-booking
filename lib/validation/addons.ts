import { z } from "zod";
import { messages } from "@/messages/da";

// One schema for the add-on catalogue form (admin create/edit, #7): the
// client resolver and the server action both parse with it. Money is
// entered as whole kroner and stored as integer øre (ADR-0019). The
// pricing model is the fixed-vs-per-participant distinction the admin UI
// must make clear (ADR-0011). Display order is a drag-and-drop on the
// catalogue table, not a field on the form.

const { errors } = messages.addons;

// Postgres accepts any 8-4-4-4-12 hex as uuid — zod v4's z.uuid() is
// stricter (rejects version-nibble 0, so seeded IDs fail).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const addonFormSchema = z.object({
  addonId: z.string().regex(UUID_RE).optional(),
  description: z.string().trim().max(5000, errors.tooLong).optional(),
  isActive: z.boolean(),
  name: z.string().trim().min(1, errors.nameMin).max(100),
  priceKroner: z
    .number({ message: errors.priceWholeKroner })
    .int(errors.priceWholeKroner)
    .min(0, errors.priceMin),
  pricingModel: z.enum(["fixed", "per_participant"]),
});

export type AddonFormValues = z.infer<typeof addonFormSchema>;
