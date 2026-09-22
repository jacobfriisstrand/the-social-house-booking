import { z } from "zod";
import {
  emailButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailRule,
  emailTokenNote,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

export const companyChangeReview = {
  html: emailLayout({
    body: `${emailHeading("Virksomhedsoplysninger", "Godkend ændringer")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("Der er sendt ændringer til virksomhedens oplysninger til godkendelse. Kontrollér ændringerne, før de bliver aktive.")}
${emailRule()}
<tr><td style="padding-bottom:8px;color:#575757;font-size:11px;font-weight:600;letter-spacing:1.2px;line-height:16px;text-transform:uppercase;">Næste skridt</td></tr>
<tr><td style="padding-bottom:22px;color:#262626;font-size:14px;line-height:22px;">Åbn gennemgangen og godkend den samlede ændring fra den nuværende primære email.</td></tr>
<tr><td style="padding:4px 0 24px;">${emailButton("Se og godkend ændringer", "{{{ACTION_URL}}}")}</td></tr>
<tr><td>${emailTokenNote("{{{VALID_MINUTES}}}")}</td></tr>`,
    preheader: "Kontrollér og godkend ændringer til virksomhedens oplysninger.",
    title: "Godkend ændringer af virksomhedens oplysninger",
  }),
  subject: "Godkend ændringer af virksomhedens oplysninger",
  variables: z.object({
    ACTION_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    VALID_MINUTES: z.number(),
  }),
} satisfies EmailTemplate;
