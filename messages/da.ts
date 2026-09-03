// All user-visible copy in Danish, keyed by feature (ADR-0016, docs/agents/ui.md).
// Components import from here; no Danish string literals in components.
export const messages = {
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
  manifest: {
    name: "The Social House",
    shortName: "Social House",
  },
  metadata: {
    description: "Booking af mødelokaler i The Social House",
    title: "The Social House",
  },
} as const;
