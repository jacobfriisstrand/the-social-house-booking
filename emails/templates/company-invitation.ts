// Bilag 2, Mail 1 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the Auth Send Email Hook (supabase/functions/send-email) on
// `invite`; `npm run email:sync` publishes it to Resend under this alias.
// Variables are Resend placeholders ({{{KEY}}}); the sender HTML-escapes the
// values, and Resend derives the plain-text part from this HTML.
import { z } from "zod";
import type { EmailTemplate } from "./registry";

export const companyInvitation = {
  html: `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Jeres bookingadgang til The Social House er klar</title>
</head>
<body style="margin:0;padding:0;background:#faf8f2;color:#262626;font-family:Poppins,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #f4f1eb;border-radius:8px;">
<tr><td style="padding:32px;font-size:16px;line-height:24px;">
<p style="margin:0 0 16px;">Kære {{{COMPANY_DISPLAY_NAME}}}</p>
<p style="margin:0 0 16px;">Som medlem har I nu adgang til at booke mødelokalerne i The Social House.</p>
<p style="margin:0 0 16px;">Her kan I se ledige tider, finde det lokale, der passer til jeres møde, og se jeres medlemspris, inden I booker.</p>
<p style="margin:0 0 16px;">Det tager kun få minutter at komme i gang:</p>
<p style="margin:0 0 12px;"><strong>STEP 1</strong><br>Vælg jeres password.</p>
<p style="margin:0 0 12px;"><strong>STEP 2</strong><br>Kontrollér og udfyld virksomhedens stam- og faktureringsoplysninger.</p>
<p style="margin:0 0 24px;"><strong>STEP 3</strong><br>Vælg lokale og tidspunkt, og foretag jeres første booking.</p>
<p style="margin:0 0 24px;"><a href="{{{ACTION_URL}}}" style="display:inline-block;background:#cf975a;color:#262626;text-decoration:none;font-weight:600;text-transform:uppercase;padding:12px 20px;border-radius:8px;">Åbn jeres bookingadgang</a></p>
<p style="margin:0 0 16px;">Når de nødvendige oplysninger er på plads, er I klar til at foretage jeres første booking.</p>
<p style="margin:0 0 24px;">Har I spørgsmål eller brug for hjælp, er I altid velkomne til at kontakte os på <a href="mailto:booking@thesocialhouse.dk" style="color:#262626;">booking@thesocialhouse.dk</a>.</p>
<p style="margin:0 0 16px;font-style:italic;">Our house is your stage.</p>
<p style="margin:0;">De bedste hilsner<br>The Social House</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  subject: "Jeres bookingadgang til The Social House er klar",
  variables: z.object({
    ACTION_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
  }),
} satisfies EmailTemplate;
