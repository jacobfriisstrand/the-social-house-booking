import { z } from "zod";
import {
  emailButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailTokenNote,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

export const passwordReset = {
  html: emailLayout({
    body: `${emailHeading("Adgangskode", "Vælg et nyt password")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("Vi har modtaget en anmodning om at vælge et nyt password til jeres bookingadgang.")}
<tr><td style="padding:4px 0 24px;">${emailButton("Vælg et nyt password", "{{{ACTION_URL}}}")}</td></tr>
<tr><td style="padding-bottom:22px;">${emailTokenNote("{{{VALID_MINUTES}}}")}</td></tr>
${emailParagraph("Hvis I ikke har bedt om at få ændret jeres password, skal I ikke foretage jer noget. Jeres nuværende password forbliver uændret.")}`,
    preheader: "Vælg et nyt password til jeres bookingadgang.",
    title: "Vælg et nyt password til jeres bookingadgang",
  }),
  subject: "Vælg et nyt password til jeres bookingadgang",
  variables: z.object({
    ACTION_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    VALID_MINUTES: z.number(),
  }),
} satisfies EmailTemplate;
