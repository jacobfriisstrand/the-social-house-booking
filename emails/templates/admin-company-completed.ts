// Bilag 2, Mail 10 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the app to ADMIN_NOTIFY_EMAIL once, when a company's master data
// goes from incomplete to complete (#1). The subject carries a placeholder
// too; sendMail() substitutes it. Values are inserted unescaped by
// {{{KEY}}}, so the caller HTML-escapes them (lib/domain/company-master-data.ts).
import { z } from "zod";
import type { EmailTemplate } from "./registry";

export const adminCompanyCompleted = {
  html: `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>{{{COMPANY_DISPLAY_NAME}}} har færdiggjort sin oprettelse</title>
</head>
<body style="margin:0;padding:0;background:#faf8f2;color:#262626;font-family:Poppins,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #f4f1eb;border-radius:8px;">
<tr><td style="padding:32px;font-size:16px;line-height:24px;">
<p style="margin:0 0 16px;">{{{COMPANY_DISPLAY_NAME}}} har udfyldt sine stam- og faktureringsoplysninger.</p>
<p style="margin:0 0 24px;">Visningsnavn: {{{COMPANY_DISPLAY_NAME}}}<br>
Juridisk virksomhedsnavn: {{{COMPANY_LEGAL_NAME}}}<br>
CVR- eller VAT-nummer: {{{COMPANY_CVR_NUMBER}}}<br>
Primær kontaktperson: {{{COMPANY_CONTACT_NAME}}}<br>
Arbejdsmail: {{{COMPANY_EMAIL}}}<br>
Mobilnummer: {{{COMPANY_CONTACT_PHONE}}}<br>
Faktureringsmetode: {{{COMPANY_BILLING_METHOD}}}<br>
Faktura-e-mail eller EAN: {{{COMPANY_INVOICE_DETAILS}}}</p>
<p style="margin:0 0 24px;"><a href="{{{ACTION_URL}}}" style="display:inline-block;background:#cf975a;color:#262626;text-decoration:none;font-weight:600;text-transform:uppercase;padding:12px 20px;border-radius:8px;">Åbn virksomheden</a></p>
<p style="margin:0;">Admin kan herefter kontrollere oplysningerne og supplere eventuelle interne oplysninger, rabatter eller særaftaler.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  subject: "{{{COMPANY_DISPLAY_NAME}}} har færdiggjort sin oprettelse",
  variables: z.object({
    ACTION_URL: z.string(),
    COMPANY_BILLING_METHOD: z.string(),
    COMPANY_CONTACT_NAME: z.string(),
    COMPANY_CONTACT_PHONE: z.string(),
    COMPANY_CVR_NUMBER: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    COMPANY_EMAIL: z.string(),
    COMPANY_INVOICE_DETAILS: z.string(),
    COMPANY_LEGAL_NAME: z.string(),
  }),
} satisfies EmailTemplate;
