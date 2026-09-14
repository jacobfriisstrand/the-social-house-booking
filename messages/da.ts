// Danish UI copy (ADR-0016), keyed by feature (docs/agents/ui.md).
// Components import from here; no Danish string literals in components.
export const messages = {
  admin: {
    companiesLink: "Virksomheder",
    homeTitle: "Administration",
  },
  booking: {
    admin: {
      created: (bookingNumber: string) =>
        `Bookingen ${bookingNumber} er oprettet og bekræftet.`,
      demo: {
        description:
          "Udviklingsside for bookinger, som admin opretter på en virksomheds vegne (#14). Bookingen bekræftes med det samme uden bekræftelseskode. Tidspunkter tolkes i browserens tidszone. Den rigtige dialog kommer med #4.",
        title: "Booking for virksomhed (udvikling)",
      },
      errors: {
        companyIncomplete:
          "Virksomhedens stam- og faktureringsoplysninger skal udfyldes, før den kan have bookinger.",
        companyNotFound: "Virksomheden findes ikke.",
      },
      fields: {
        company: "Virksomhed",
      },
      submit: "Opret booking",
      submitting: "Opretter …",
    },
    confirmed: "Booking bekræftet",
    demo: {
      description:
        "Udviklingsside for bookerbekræftelsen (#2). Tidspunkter tolkes i browserens tidszone. Den rigtige bookingdialog kommer med #4.",
      submit: "Book nu",
      submitting: "Opretter …",
      title: "Booking (udvikling)",
    },
    errors: {
      codeConsumed: "Koden er allerede brugt. Send en ny kode.",
      codeExpired: "Koden er udløbet. Send en ny kode.",
      codeFormat: "Indtast de seks cifre fra mailen.",
      codeLocked: "For mange forsøg. Start bookingen forfra.",
      codeWrong: (attemptsLeft: number) =>
        `Forkert kode. Du har ${attemptsLeft} forsøg tilbage.`,
      createFailed: "Bookingen kunne ikke oprettes. Prøv igen.",
      emailInvalid: "Indtast en gyldig arbejdsemail.",
      endBeforeStart: "Sluttidspunktet skal være efter starttidspunktet.",
      holdExpired: "Tiden til at bekræfte er udløbet. Start bookingen forfra.",
      mailFailed:
        "Bekræftelseskoden kunne ikke sendes. Kontrollér arbejdsemailen og prøv igen.",
      participantsInvalid: "Indtast antal deltagere.",
      required: "Feltet skal udfyldes.",
      roomCapacity: "Lokalet har ikke plads til så mange deltagere.",
      roomNotFound: "Lokalet findes ikke.",
      slotTaken: "Lokalet er ikke ledigt i det valgte tidsrum.",
      tooLong: "Teksten er for lang.",
      tooManyResends:
        "Der kan ikke sendes flere koder til denne booking. Start bookingen forfra.",
      verifyFailed: "Koden kunne ikke bekræftes. Prøv igen.",
    },
    fields: {
      bookerEmail: "Arbejdsemail",
      bookerName: "Fulde navn",
      bookerPhone: "Mobilnummer",
      code: "Bekræftelseskode",
      endAt: "Slut",
      participantCount: "Antal deltagere",
      room: "Lokale",
      startAt: "Start",
    },
    verification: {
      codeSent: "Vi har sendt en ny kode",
      confirm: "Bekræft booking",
      confirming: "Bekræfter …",
      countdown: (remaining: string) =>
        `Du har ${remaining} til at bekræfte bookingen.`,
      expired: "Tiden til at bekræfte er udløbet. Start bookingen forfra.",
      resend: "Send ny kode",
      resending: "Sender …",
      sentTo: (email: string) =>
        `Vi har sendt en sekscifret kode til ${email}. Indtast den her for at gennemføre bookingen.`,
      title: "Bekræft din booking",
    },
  },
  common: {
    loading: "Indlæser …",
    signOut: "Log ud",
    unauthorized: "Du har ikke adgang til at se den side du forsøgte at tilgå.",
    unauthorizedTitle: "Ikke autoriseret",
  },
  companies: {
    back: "Tilbage til virksomheder",
    columns: {
      discount: "Rabat",
      displayName: "Visningsnavn",
      email: "Email",
      masterData: "Stamdata",
      status: "Medlemsstatus",
    },
    create: "Opret virksomhed",
    createDescription:
      "Et medlem får en invitation på mail og vælger selv sin adgangskode. En ekstern virksomhed opretter du uden invitation.",
    createSubmit: {
      external: "Opret virksomhed",
      member: "Opret og send invitation",
    },
    createSubmitting: "Opretter …",
    emptyDescription: "Opret den første virksomhed for at sende en invitation.",
    emptyTitle: "Ingen virksomheder endnu",
    errors: {
      createFailed: "Virksomheden kunne ikke oprettes. Prøv igen.",
      emailChangeFailed: "Emailen kunne ikke ændres. Prøv igen.",
      emailTaken: "Emailen bruges allerede af en anden virksomhed.",
      inviteFailed:
        "Virksomheden er oprettet, men invitationen kunne ikke sendes. Send den igen herfra.",
      notFound: "Virksomheden findes ikke.",
      resendFailed:
        "Invitationen kunne ikke sendes. Har virksomheden allerede valgt adgangskode, skal den bruge Glemt adgangskode i stedet.",
      saveFailed: "Ændringerne kunne ikke gemmes. Prøv igen.",
    },
    invitationSent: "Invitationen er sendt",
    masterDataComplete: "Udfyldt",
    masterDataMissing: "Mangler",
    membership: {
      external: "Ekstern",
      member: "Medlem",
    },
    resendInvitation: "Send invitation igen",
    resending: "Sender …",
    save: "Gem",
    saved: "Ændringerne er gemt",
    saving: "Gemmer …",
    sections: {
      account: "Konto",
      internal: "Interne oplysninger",
      masterData: "Stam- og faktureringsoplysninger",
    },
    title: "Virksomheder",
  },
  company: {
    bookingsTitle: "Bookinger",
    masterDataLink: "Virksomhedens oplysninger",
  },
  companyFields: {
    attention: "Att. (valgfrit)",
    billingAddress: "Faktureringsadresse",
    billingCity: "By",
    billingCountry: "Land",
    billingNotes: "Bemærkninger til fakturering, fx EAN (valgfrit)",
    billingPostalCode: "Postnummer",
    contactName: "Primær kontaktperson",
    contactPhone: "Kontaktpersonens mobilnummer",
    cvrNumber: "CVR- eller VAT-nummer",
    defaultCountry: "Danmark",
    department: "Afdeling (valgfrit)",
    discountPercent: "Rabat i procent",
    displayName: "Visningsnavn",
    economicCustomerNumber: "Kundenummer i e-conomic (valgfrit)",
    email: "Email (login og kontakt)",
    errors: {
      discountInvalid: "Rabatten skal være et helt tal mellem 0 og 100.",
      emailInvalid: "Indtast en gyldig email.",
      externalDiscount:
        "En ekstern virksomhed betaler fuld pris og kan ikke få rabat.",
      membershipInvalid: "Vælg medlemsstatus.",
      required: "Feltet skal udfyldes.",
      tooLong: "Teksten er for lang.",
    },
    internalNote: "Intern note (valgfrit)",
    invoiceEmail: "Faktura-email",
    legalName: "Juridisk virksomhedsnavn",
    membershipStatus: "Medlemsstatus",
    membershipStatusHint: {
      external:
        "Betaler fuld lokalepris. Oprettes uden invitation; du udfylder oplysningerne selv.",
      member: "Får rabat på lokaleleje og en invitation på mail.",
    },
    reference: "PO-nummer, reference eller omkostningssted (valgfrit)",
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
  error: {
    description: "Prøv igen. Fortsætter fejlen, så kontakt The Social House.",
    retry: "Prøv igen",
    title: "Der skete en fejl",
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
    submitting: "Logger ind …",
  },
  manifest: {
    name: "The Social House",
    shortName: "Social House",
  },
  masterData: {
    description:
      "Udfyld virksomhedens stam- og faktureringsoplysninger. Derefter kan I booke lokaler.",
    emailHint: "Kontakt The Social House for at ændre emailen.",
    errors: {
      saveFailed: "Oplysningerne kunne ikke gemmes. Prøv igen.",
    },
    saved: "Oplysningerne er gemt",
    submit: "Gem oplysninger",
    submitting: "Gemmer …",
    title: "Virksomhedens oplysninger",
  },
  metadata: {
    description: "Booking af mødelokaler i The Social House",
    title: "The Social House",
  },
  setPassword: {
    description: "Vælg den adgangskode, virksomheden logger ind med.",
    errors: {
      linkInvalid:
        "Linket er ugyldigt eller udløbet. Bed The Social House om en ny invitation.",
      mismatch: "De to adgangskoder er ikke ens.",
      passwordMin: "Adgangskoden skal være mindst 8 tegn.",
      saveFailed: "Adgangskoden kunne ikke gemmes. Prøv igen.",
    },
    password: "Adgangskode",
    passwordConfirm: "Gentag adgangskode",
    submit: "Gem adgangskode",
    submitting: "Gemmer …",
    title: "Vælg adgangskode",
  },
} as const;
