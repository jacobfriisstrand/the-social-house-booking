import { z } from "zod";
import {
  emailButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailTokenNote,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

export const companyChangeNewEmail = {
  html: emailLayout({
    body: `${emailHeading("Sikkerhed", "Bekræft ny primær email")}
${emailParagraph("Der er foreslået en ny primær email til {{{COMPANY_DISPLAY_NAME}}}.")}
${emailParagraph("Bekræft den nye email for at gennemføre ændringen. Først derefter bliver den nye adresse virksomhedens login- og recovery-adresse.")}
<tr><td style="padding:4px 0 24px;">${emailButton("Bekræft ny email", "{{{ACTION_URL}}}")}</td></tr>
<tr><td style="padding-bottom:22px;">${emailTokenNote("{{{VALID_MINUTES}}}")}</td></tr>
${emailParagraph("Hvis I ikke forventede denne ændring, skal I ikke bruge linket.")}`,
    preheader: "Bekræft den nye primære email til virksomhedens bookingadgang.",
    title: "Bekræft ny primær email til virksomhedens bookingadgang",
  }),
  subject: "Bekræft ny primær email til virksomhedens bookingadgang",
  variables: z.object({
    ACTION_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    VALID_MINUTES: z.number(),
  }),
} satisfies EmailTemplate;
