// Bilag 2, Mail 2 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by lib/bookings/actions.ts when a hold is created or a new code is
// requested; `npm run email:sync` publishes it to Resend under this alias.
// Variables are Resend placeholders ({{{KEY}}}); the sender HTML-escapes the
// values, and Resend derives the plain-text part from this HTML.
import { z } from "zod";
import type { EmailTemplate } from "./registry";

export const verificationCode = {
  html: `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Bekræft jeres booking i The Social House</title>
</head>
<body style="margin:0;padding:0;background:#faf8f2;color:#262626;font-family:Poppins,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #f4f1eb;border-radius:8px;">
<tr><td style="padding:32px;font-size:16px;line-height:24px;">
<p style="margin:0 0 16px;">Kære {{{COMPANY_DISPLAY_NAME}}}</p>
<p style="margin:0 0 16px;">Indtast denne kode i bookingplatformen for at bekræfte bookingen:</p>
<p style="margin:0 0 16px;font-family:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:0.25em;line-height:40px;">{{{CODE}}}</p>
<p style="margin:0 0 16px;">Koden er gyldig i {{{VALID_MINUTES}}} minutter.</p>
<p style="margin:0 0 16px;">Bookingen er først gennemført, når koden er indtastet og godkendt.</p>
<p style="margin:0 0 24px;">Hvis I ikke er i gang med at booke et lokale, kan I se bort fra mailen.</p>
<p style="margin:0;">De bedste hilsner<br>The Social House</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  subject: "Bekræft jeres booking i The Social House",
  variables: z.object({
    CODE: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    VALID_MINUTES: z.number(),
  }),
} satisfies EmailTemplate;
