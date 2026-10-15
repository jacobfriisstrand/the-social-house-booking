import { z } from "zod";
import {
  emailHeading,
  emailLayout,
  emailNotice,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

export const companyChangeCompleted = {
  html: emailLayout({
    body: `${emailHeading("Sikkerhedsopdatering", "Primær email er ændret")}
${emailParagraph(
  "Den primære email til {{{COMPANY_DISPLAY_NAME}}} er ændret til <strong>{{{NEW_EMAIL}}}</strong>."
)}
${emailNotice("Alle aktive sessioner på virksomhedens fælles konto er afsluttet.")}
${emailRule()}
${emailParagraph(
  "Brug den nye email og adgangskode ved næste login. Virksomheden er selv ansvarlig for at informere medarbejderne om de nye loginoplysninger.",
  28
)}`,
    preheader:
      "Virksomhedens primære email er ændret, og aktive sessioner er afsluttet.",
    title: "Virksomhedens primære email er ændret",
  }),
  subject: "Virksomhedens primære email er ændret",
  variables: z.object({
    COMPANY_DISPLAY_NAME: z.string(),
    NEW_EMAIL: z.string(),
  }),
} satisfies EmailTemplate;
