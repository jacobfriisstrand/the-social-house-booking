// Danish UI copy (ADR-0016), keyed by feature (docs/agents/ui.md).
// Components import from here; no Danish string literals in components.
export const messages = {
  admin: {
    homeTitle: "Administration",
  },
  common: {
    signOut: "Log ud",
    unauthorized: "Du har ikke adgang til at se den side du forsøgte at tilgå.",
    unauthorizedTitle: "Ikke autoriseret",
  },
  company: {
    bookingsTitle: "Bookinger",
  },
  dashboard: {
    title: "Dashboard",
  },
  demo: {
    description:
      "Baseline for formularer: react-hook-form, zod og en Server Action. Bookingformularen tager udgangspunkt i denne opbygning.",
    errors: {
      emailInvalid: "Indtast en gyldig mailadresse.",
      messageMax: "Beskeden må højst fylde 500 tegn.",
      nameMin: "Navnet skal være mindst 2 tegn.",
    },
    fields: {
      email: "Arbejdsmail",
      message: "Besked (valgfrit)",
      messagePlaceholder: "Hvad drejer det sig om?",
      name: "Navn",
    },
    submit: "Send",
    submitting: "Sender …",
    successDescription: "Vi vender tilbage hurtigst muligt.",
    successTitle: "Tak for din besked.",
    title: "Formularer",
    toastError: "Der opstod en fejl. Prøv igen.",
    toastSuccess: "Beskeden er sendt",
  },
  format: {
    exclVat: "ekskl. moms",
  },
  login: {
    email: "Email",
    failed: "Forkert email eller adgangskode",
    invalidEmail: "Indtast en gyldig email",
    missingPassword: "Indtast adgangskoden",
    password: "Adgangskode",
    seedAdminEmail: "admin@thesocialhouse.dk",
    seedAdminLabel: "Administrator",
    seedExternalEmail: "booking@nordicevents.dk",
    seedExternalLabel: "Ekstern virksomhed",
    seedHint: "Demo-logins (adgangskode: password)",
    seedMemberEmail: "kontakt@rituals.dk",
    seedMemberLabel: "Medlemsvirksomhed",
    submit: "Log ind",
  },
  manifest: {
    name: "The Social House",
    shortName: "Social House",
  },
  metadata: {
    description: "Booking af mødelokaler i The Social House",
    title: "The Social House",
  },
} as const;
