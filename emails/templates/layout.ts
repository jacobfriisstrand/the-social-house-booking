const COLORS = {
  background: "#faf8f2",
  border: "#f4f1eb",
  foreground: "#262626",
  muted: "#575757",
  primary: "#cf975a",
  primaryTint: "#f5e9da",
} as const;

const FONT = "Poppins,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export const emailButton = (label: string, href: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-radius:6px;background:${COLORS.primary};">
<a href="${href}" style="display:inline-block;border-radius:6px;padding:13px 20px;color:${COLORS.foreground};font-size:14px;font-weight:600;line-height:20px;text-decoration:none;">${label}</a>
</td></tr>
</table>`;

export const emailNotice = (content: string): string => `
<tr><td style="padding-bottom:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.primaryTint};border-left:3px solid ${COLORS.primary};">
<tr><td style="padding:14px 16px;color:${COLORS.foreground};font-size:13px;line-height:20px;">${content}</td></tr>
</table>
</td></tr>`;

export const emailLayout = ({
  body,
  preheader,
  title,
}: {
  body: string;
  preheader: string;
  title: string;
}): string => `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};color:${COLORS.foreground};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.background};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:9px;">
<tr><td style="height:6px;background:${COLORS.primary};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:25px 28px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding-bottom:25px;color:${COLORS.foreground};font-size:13px;font-weight:700;letter-spacing:1.8px;line-height:18px;text-transform:uppercase;">THE SOCIAL HOUSE</td></tr>
${body}
<tr><td style="padding-top:28px;color:${COLORS.muted};font-size:13px;line-height:20px;">De bedste hilsner<br><strong style="color:${COLORS.foreground};">The Social House</strong></td></tr>
</table>
</td></tr>
</table>
<p style="margin:14px 0 0;color:${COLORS.muted};font-size:11px;line-height:16px;text-align:center;">Our house is your stage.</p>
</td></tr>
</table>
</body>
</html>`;

export const emailHeading = (eyebrow: string, heading: string): string => `
<tr><td style="padding-bottom:22px;">
<p style="margin:0 0 8px;color:${COLORS.muted};font-size:11px;font-weight:600;letter-spacing:1.4px;line-height:16px;text-transform:uppercase;">${eyebrow}</p>
<h1 style="margin:0;color:${COLORS.foreground};font-size:25px;font-weight:600;letter-spacing:-0.4px;line-height:32px;">${heading}</h1>
</td></tr>`;

export const emailParagraph = (content: string, bottomPadding = 16): string => `
<tr><td style="padding-bottom:${bottomPadding}px;color:${COLORS.foreground};font-size:14px;line-height:22px;">${content}</td></tr>`;

export const emailRule = (): string => `
<tr><td style="height:1px;padding:8px 0 20px;font-size:0;line-height:0;"><div style="height:1px;background:${COLORS.border};">&nbsp;</div></td></tr>`;

export const emailTokenNote = (minutes: string): string =>
  emailNotice(
    `<strong>Et sikkert link</strong><br>Linket er gyldigt i ${minutes} minutter og kan kun bruges én gang.`
  );
