// Danish UI copy (ADR-0016), keyed by feature (docs/agents/ui.md).
// Components import from here; no Danish string literals in components.
export const messages = {
  // The add-on catalogue (admin, #7): Bilag 1 "Add-ons" — name,
  // description, price excl. VAT, fixed vs per-participant, active. The
  // pricing model is stated on every surface; add-ons are never discounted
  // (ADR-0007) and House Service/House Host are ordinary add-ons, seeded
  // into every environment (ADR-0015).
  addons: {
    actions: {
      open: (name: string) => `Handlinger for ${name}`,
    },
    activate: "Aktiver",
    activeColumn: "Status",
    activeLabel: "Aktiv",
    basicSection: "Grundoplysninger",
    createButton: "Opret tilkøb",
    createTitle: "Nyt tilkøb",
    deactivate: "Deaktiver",
    descriptionColumn: "Beskrivelse",
    editLabel: "Rediger",
    editTitle: "Rediger tilkøb",
    emptyDescription: "Opret det første tilkøb for at koble det til lokaler.",
    emptyTitle: "Ingen tilkøb",
    errors: {
      nameMin: "Angiv et navn.",
      priceMin: "Prisen skal være 0 eller mere.",
      priceWholeKroner: "Prisen skal være et helt antal kroner.",
      reorderFailed: "Rækkefølgen kunne ikke gemmes. Prøv igen.",
      saveFailed: "Tilvalget kunne ikke gemmes. Prøv igen.",
      statusFailed: "Statussen kunne ikke ændres. Prøv igen.",
      tooLong: "Teksten er for lang.",
    },
    fields: {
      description: "Beskrivelse",
      isActive: "Aktiv",
      name: "Navn",
      price: "Pris ekskl. moms (kr.)",
      pricingModel: "Prissætning",
      pricingModelFixed:
        "Ét fast beløb for hele bookingen, uanset antal deltagere",
      pricingModelFixedShort: "Fast pris",
      pricingModelPerParticipant:
        "Prisen ganges med antallet af deltagere på bookingen",
      pricingModelPerParticipantShort: "Pr. deltager",
    },
    nameColumn: "Navn",
    priceColumn: "Pris",
    pricingColumn: "Prissætning",
    saved: "Tilvalget er gemt",
    saving: "Gemmer …",
    sortOrderDragHandle: "Træk for at sortere",
    statusUpdated: "Status er opdateret",
    submit: "Gem",
    title: "Tilkøb",
  },
  admin: {
    companiesLink: "Virksomheder",
    homeTitle: "Administration",
  },
  booking: {
    // Selected add-ons (#7, Bilag 1 "Tilvalg"): prices excl. VAT, never
    // discounted (ADR-0007). House Service and House Host are plain
    // add-ons; any guidance lives in their description (ADR-0015).
    addOns: {
      catering: {
        accept:
          "Jeg har læst reglerne og accepterer, at forplejning bestilles gennem The Social House.",
        rule: "Kaffe, te, vand, frokost, anden forplejning og hospitality bestilles gennem The Social House. Det er ikke tilladt at medbringe egne mad- og drikkevarer, ekstern catering eller eksternt hospitalitypersonale, medmindre andet er aftalt med os på forhånd.",
        title: "Forplejning og hospitality",
      },
      empty: "Dette lokale har ingen tilkøb.",
      fixed: "Fast pris",
      perParticipant: "pr. deltager",
      quantityLabel: "Antal",
      title: "Tilkøb",
    },
    admin: {
      created: (bookingNumber: string) =>
        `Bookingen ${bookingNumber} er oprettet og bekræftet.`,
      errors: {
        companyIncomplete:
          "Virksomhedens stam- og faktureringsoplysninger skal udfyldes, før den kan have bookinger.",
        companyNotFound: "Virksomheden findes ikke.",
      },
      fields: {
        company: "Virksomhed",
        companyPlaceholder: "Vælg virksomhed",
        totalPrice: "Totalpris (ekskl. moms)",
        totalPriceHint: "Efterlad tom for den beregnede pris.",
      },
      submit: "Opret booking",
      submitting: "Opretter …",
    },
    complete: {
      bookAnother: "Book et lokale mere",
      booker: "Ansvarlig booker",
      bookingNumber: "Bookingnummer",
      date: "Dato",
      description: "Bookingen er bekræftet, og lokalet er reserveret.",
      heading: "Tak for din booking",
      // The invoice read-back (#122): a booking visited here after it has
      // been invoiced shows the number and date.
      invoiceDate: "Fakturadato",
      invoiceNumber: "Fakturanummer",
      participants: "Deltagere",
      room: "Lokale",
      time: "Tidspunkt",
      title: "Booking bekræftet",
      toBookings: "Se bookinger",
      total: "Forventet total",
    },
    confirmed: "Booking bekræftet",
    dialog: {
      addonFree: "Gratis",
      back: "Tilbage",
      bookerIntro:
        "Bookingen skal have en ansvarlig person, som vi kan kontakte om mødet.",
      bookerVerify:
        "Vi sender en sekscifret kode til arbejdsemailen, som bekræfter bookingen.",
      calendarLabel: "Vælg dato",
      endLabel: "Sluttidspunkt",
      endListLabel: "Sluttidspunkter",
      next: "Næste",
      noEndSlots: "Vælg et starttidspunkt først.",
      noStartSlots: "Ingen ledige starttidspunkter den dag.",
      overview: {
        addOns: "Tilkøb",
        booker: "Ansvarlig booker",
        company: "Virksomhed",
        date: "Dato",
        noAddOns: "Ingen",
        participants: "Deltagere",
        time: "Tidspunkt",
      },
      participantsHint: (max: number) => `Maks. ${max}`,
      readAbout: (name: string) => `Læs om ${name}`,
      slotStatus: {
        blocked: "Optaget",
        closed: "Lukket",
        past: "Passeret",
      },
      startLabel: "Starttidspunkt",
      startListLabel: "Starttidspunkter",
      stepOf: (step: number, total: number) => `Trin ${step} af ${total}`,
      steps: {
        booker: "Booker",
        confirm: "Bekræft",
        extras: "Tilkøb",
        overview: "Oversigt",
        time: "Tidspunkt",
      },
      stepsLabel: "Trin i bookingen",
      stepTitles: {
        booker: "Ansvarlig booker",
        confirm: "Bekræft din booking",
        extras: "Vælg tilkøb",
        overview: "Oversigt over din booking",
        time: "Vælg dato og tidspunkt",
      },
      submit: "Book nu",
      submitting: "Opretter …",
      // "Jeg accepterer bookingbetingelserne og har læst
      // privatlivspolitikken", each text a link (#15).
      terms: {
        bookingTerms: "bookingbetingelserne",
        middle: " og har læst ",
        privacyPolicy: "privatlivspolitikken",
        start: "Jeg accepterer ",
      },
    },
    errors: {
      addOnInvalid:
        "Et af de valgte tilkøb hører ikke til dette lokale. Fjern det og prøv igen.",
      addOnQuantity: (max: number) => `Vælg et antal mellem 1 og ${max}.`,
      addOnQuantityInvalid: "Antallet skal være et helt tal på mindst 1.",
      beyondHorizon: "Der kan bookes op til 12 måneder frem.",
      cateringAcceptRequired:
        "Du skal acceptere reglerne for forplejning, før du kan booke.",
      codeConsumed: "Koden er allerede brugt. Send en ny kode.",
      codeExpired: "Koden er udløbet. Send en ny kode.",
      codeFormat: "Indtast de seks cifre fra mailen.",
      codeLocked: "For mange forsøg. Start bookingen forfra.",
      codeWrong: (attemptsLeft: number) =>
        `Forkert kode. Du har ${attemptsLeft} forsøg tilbage.`,
      createFailed: "Bookingen kunne ikke oprettes. Prøv igen.",
      emailInvalid: "Indtast en gyldig arbejdsemail.",
      holdExpired: "Tiden til at bekræfte er udløbet. Start bookingen forfra.",
      inPast: "Starttidspunktet skal ligge i fremtiden.",
      mailFailed:
        "Bekræftelseskoden kunne ikke sendes. Kontrollér arbejdsemailen og prøv igen.",
      notCancellable: "Bookingen kan ikke afbookes.",
      offGrid: "Vælg tidspunkter i hele og halve timer.",
      outsideOpeningHours:
        "Bookingen skal ligge inden for lokalets åbningstider.",
      participantsInvalid: "Indtast antal deltagere.",
      required: "Feltet skal udfyldes.",
      roomCapacity: "Lokalet har ikke plads til så mange deltagere.",
      roomNotFound: "Lokalet findes ikke.",
      slotTaken: "Lokalet er ikke ledigt i det valgte tidsrum.",
      termsRequired: "Du skal acceptere bookingbetingelserne.",
      termsUnavailable:
        "Betingelserne kunne ikke findes. Genindlæs siden, og prøv igen.",
      tooLong: "Teksten er for lang.",
      tooManyResends:
        "Der kan ikke sendes flere koder til denne booking. Start bookingen forfra.",
      tooShort: "Bookingen skal vare mindst 30 minutter.",
      verifyFailed: "Koden kunne ikke bekræftes. Prøv igen.",
    },
    fields: {
      bookerEmail: "Arbejdsemail",
      bookerName: "Fulde navn",
      bookerPhone: "Mobilnummer",
      code: "Bekræftelseskode",
      endAt: "Slut",
      participantCount: "Antal deltagere",
      practicalNotes: "Bemærkninger",
      room: "Lokale",
      startAt: "Start",
    },
    price: {
      addOnInfo: "Vis beskrivelse",
      addOns: "Tilkøb",
      exclVat: "ekskl. moms",
      manualAmount: "Manuelt beløb",
      manualAmountInfo: "Forklaring",
      memberDiscount: (percent: number) => `Medlemsrabat (${percent} %)`,
      room: "Lokale",
      total: "Total",
    },
    search: {
      date: "Dato",
      description: "Find de lokaler, der er ledige og har plads nok.",
      from: "Fra",
      participants: "Antal deltagere",
      submit: "Søg",
      title: "Book lokale",
      to: "Til",
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
    },
  },
  bookings: {
    admin: {
      actions: {
        details: "Vis detaljer",
        open: (bookingNumber: string) => `Handlinger for ${bookingNumber}`,
      },
      breakdown: {
        bookings: "Bookinger",
        byCompany: "Pr. virksomhed",
        byRoom: "Pr. lokale",
        hours: "Timer",
        title: "Fordeling",
        total: "Total ekskl. moms",
      },
      calendar: {
        more: (count: number) => `${count} flere`,
        showHiddenOn: (date: string) => `Vis de skjulte poster den ${date}`,
      },
      // Admin cancels on the company's behalf (#5): the same fee and mails
      // as the member's own cancellation, worded for the admin.
      cancel: {
        action: "Aflys booking",
        feeIntro: "Hvis bookingen afbookes nu, bliver afbestillingsgebyret:",
        mailNote:
          "Bookeren får en mail om afbookingen, og gebyret kommer med i faktureringsgrundlaget.",
        title: (room: string, company: string) =>
          `Afbook ${room} for ${company}?`,
      },
      // The header total (#121) and the per-company cash flow (#120):
      // what the currently filtered — or the ticked — bookings can still
      // be invoiced for.
      cashFlow: {
        title: "Faktureringsklar pr. virksomhed",
      },
      columns: {
        company: "Virksomhed",
        discount: "Rabat",
        hours: "Timer",
        manualAmounts: "Manuelt beløb",
        roomRent: "Lokaleleje",
        roomRentAfterDiscount: "Efter rabat",
        total: "Total ekskl. moms",
        totalPrice: "Total pris (Efter rabat)",
      },
      editLabel: "Rediger",
      editTitle: "Rediger booking",
      emptyDescription: "Bookinger i den valgte periode vises her.",
      emptyTitle: "Ingen bookinger",
      exportTitle: (company: string) => `Bookinger for ${company}`,
      filters: {
        bookingState: "Bookingstatus",
        bookingStateAll: "Alle bookinger",
        bookingStateFinished: "Afsluttede",
        company: "Virksomhed",
        companyAll: "Alle virksomheder",
        membership: "Virksomhedstype",
        membershipAll: "Medlemsstatus",
        membershipExternal: "Eksterne",
        membershipMember: "Medlemmer",
        next: "Næste",
        period: "Periode",
        periodAll: "Alle datoer",
        previous: "Forrige",
        reset: "Nulstil filtre",
        room: "Lokale",
        roomAll: "Alle lokaler",
        status: "Faktureringsstatus",
        statusAll: "Alle statuser",
        thisMonth: "Denne måned",
        worklist: "Faktureringsklar",
      },
      manualAmounts: {
        addButton: "Tilføj beløb",
        // One entry's audit line (who/when): the admin who added it and when.
        addedBy: (name: string | null, when: string) =>
          name === null ? `Tilføjet ${when}` : `Tilføjet af ${name}, ${when}`,
        delete: "Fjern",
        deleteConfirm: "Ja, fjern",
        deleted: "Beløbet er fjernet",
        deleteSentence: "Beløbet fjernes fra bookingens fakturagrundlag.",
        deleteTitle: "Fjern beløbet?",
        deleting: "Fjerner …",
        emptyDescription:
          "Beløb, som bookingen skal faktureres for, tilføjes her — fx for ekstra tid eller eksterne omkostninger.",
        emptyTitle: "Ingen tilføjede beløb",
        entriesTitle: "Tilføjede beløb",
        errors: {
          addFailed: "Beløbet kunne ikke tilføjes. Prøv igen.",
          amountInvalid: "Beløbet skal være et helt tal over 0.",
          invoiced:
            "Bookingen er allerede faktureret. Beløbet kan ikke tilføjes.",
          noteRequired: "Skriv en kort forklaring.",
          noteTooLong: "Forklaringen er for lang.",
          removeFailed: "Beløbet kunne ikke fjernes. Prøv igen.",
          tooEarly: "Beløbet kan først tilføjes, efter bookingen er afholdt.",
        },
        fields: {
          amount: "Beløb (kr., ekskl. moms)",
          amountHint: "Helt kroner, fx 250.",
          note: "Forklaring",
        },
        keep: "Fortryd",
        none: "-",
        saved: "Beløbet er tilføjet",
        submit: "Tilføj beløb",
        submitting: "Tilføjer …",
      },
      markInvoiced: {
        button: "Markér som faktureret",
        companyBookings: (name: string, count: number) =>
          `${name} (${count} ${count === 1 ? "booking" : "bookinger"})`,
        companyNumber: "Ét nummer pr. firma",
        date: "Fakturadato",
        errors: {
          alreadyMarked:
            "En eller flere bookinger er allerede markeret. Prøv igen.",
          dateRequired: "Angiv fakturadatoen.",
          failed: "Bookingerne kunne ikke markeres. Prøv igen.",
          future: "Bookinger, der ikke er afholdt, kan ikke faktureres.",
          numberRequired: "Angiv fakturanummeret.",
        },
        notInvoicableButton: "Markér som ikke fakturerbar",
        notInvoicableConfirm: "Ja, markér",
        notInvoicableSaved: "Bookingerne er markeret som ikke fakturerbar",
        notInvoicableSentence:
          "Bookingerne får statussen Ikke fakturerbar og kommer ikke med i fakturagrundlaget.",
        notInvoicableTitle: "Markér som ikke fakturerbar?",
        notInvoicedButton: "Markér som ikke faktureret",
        notInvoicedFailed: (count: number) =>
          count === 1
            ? "Bookingen kunne ikke markeres som ikke faktureret. Prøv igen."
            : "Bookingerne kunne ikke markeres som ikke faktureret. Prøv igen.",
        notInvoicedSaved: (count: number) =>
          count === 1
            ? "Bookingen er markeret som ikke faktureret"
            : "Bookingerne er markeret som ikke faktureret",
        number: "Fakturanummer",
        saved: (count: number) =>
          count === 1
            ? "Bookingen er markeret som faktureret"
            : "Bookingerne er markeret som faktureret",
        sentence: (count: number) =>
          count === 1
            ? "1 booking markeres som faktureret."
            : `${count} bookinger markeres som faktureret.`,
        submit: "Markér som faktureret",
        submitting: "Markerer …",
        title: "Markér som faktureret",
      },
      selection: {
        clear: "Fravælg alle",
        selectAll: "Vælg alle",
        selected: (count: number) => `${count} valgt`,
        selectRow: (bookingNumber: string) => `Vælg ${bookingNumber}`,
      },
      tableCaption: "Bookinger til fakturering",
      view: {
        list: "Liste",
        month: "Måned",
      },
    },
    allPricesExclVat: "Alle priser ekskl. moms",
    columns: {
      addOns: "Tilkøb",
      addOnsYes: "Ja",
      booker: "Booker",
      bookingNumber: "Bookingnummer",
      cancellationFee: "Afbestillingsgebyr",
      dateTime: "Dato og tid",
      discount: "Rabat",
      end: "Slut",
      price: "Pris",
      room: "Lokale",
      start: "Start",
      status: "Status",
    },
    empty: {
      allDescription: "Du har ingen bookinger endnu.",
      allTitle: "Ingen bookinger",
      // The filter row narrowed the list to nothing.
      filteredDescription: "Ingen bookinger passer til de valgte filtre.",
    },
    inactiveAddOn: "Tilkøb (ikke længere aktivt)",
    invoicing: {
      invoiced: "Faktureret",
      notInvoicable: "Ikke fakturerbar",
      notInvoiced: "Ikke faktureret",
    },
    noAddOns: "Ingen tilkøb",
    noCancellationFee: "-",
    noDiscount: "Ingen",
    roomRental: "Lokaleleje",
    sheet: {
      addOns: "Tilkøb",
      cancel: "Aflys booking",
      cancelledAt: "Afbooket",
      date: "Dato",
      // The invoice read-back (#122): shown only while the booking is
      // invoiced.
      invoiceDate: "Fakturadato",
      invoiceNumber: "Fakturanummer",
      participants: (count: number) => `${count} deltagere`,
      practicalNotes: "Bemærkninger",
      successWithFee: (fee: string) =>
        `Bookingen er aflyst. Afbestillingsgebyr: ${fee} ekskl. moms.`,
      successWithoutFee: "Bookingen er aflyst, og lokalet er frigivet.",
      termsTitle: "Afbestillingsregler",
      time: "Tid",
      title: "Bookingsdetaljer",
    },
    status: {
      cancelled: "Aflyst",
      confirmed: "Bekræftet",
      pendingVerification: "Afventer bekræftelse",
    },
    tableCaption: "Virksomhedens bookinger",
    tabs: {
      all: "Alle",
      cancelled: "Aflyste",
      past: "Tidligere",
      upcoming: "Kommende",
    },
  },
  cancellation: {
    alreadyCancelled: "Bookingen er allerede afbooket.",
    // Platform message 1 (Bilag 2, verbatim; #5, #11): the booking sheet's
    // confirm dialog. The fee shown is the live one; the action recomputes
    // it server-side at the exact confirm moment (ADR-0006).
    bookingNumber: "Bookingnummer",
    confirm: "Bekræft afbooking",
    confirming: "Afbooker …",
    confirmTitle: (room: string) => `Vil I afbooke ${room}?`,
    date: "Dato",
    extraCosts:
      "Eventuelle allerede påløbne udgifter til forplejning eller service kan blive faktureret særskilt.",
    feeAmount: (fee: string) => `${fee} ekskl. moms`,
    feeIntro: "Hvis I afbooker nu, bliver afbestillingsgebyret:",
    keepBooking: "Behold bookingen",
    noLongerUpcoming:
      "Bookingen kan ikke afbookes, fordi starttidspunktet er passeret. Kontakt The Social House.",
    release:
      "Når afbookingen bekræftes, frigives lokalet og den efterfølgende buffer.",
    rules: [
      "Mere end 72 timer før: intet afbestillingsgebyr.",
      "Fra og med 24 timer til og med 72 timer før: 50 %.",
      "Mindre end 24 timer før: 100 %.",
    ],
    success: "Bookingen er nu afbooket, og lokalet er igen ledigt.",
    time: "Tidspunkt",
    title: "Afbook bookingen",
    tooltip: "Afbestillingsregler",
  },
  common: {
    adminOnly: "Kun administratorer har adgang",
    breadcrumb: "Brødkrumme",
    closeSheet: "Luk",
    export: "Eksportér",
    exportCsv: "Eksportér CSV",
    exportedAt: (at: string) => `Udskrevet ${at}`,
    exportFailed: "Eksporten kunne ikke hentes. Prøv igen.",
    exportPdf: "Eksportér PDF",
    invalidRequest: "Ugyldig forespørgsel.",
    loading: "Indlæser …",
    loginRequired: "Login krævet",
    more: "Mere",
    nextSlide: "Næste billede",
    periodLabel: "Periode",
    previousSlide: "Forrige billede",
    quantityDecrease: "Én færre",
    quantityIncrease: "Én mere",
    readLess: "Læs mindre",
    readMore: "Læs mere",
    signOut: "Log ud",
    totalLabel: "I alt",
    unauthorized: "Du har ikke adgang til at se den side du forsøgte at tilgå.",
    unauthorizedTitle: "Ikke autoriseret",
    yes: "Ja",
  },
  companies: {
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
    created: "Virksomheden er oprettet",
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
    selection: {
      clear: "Fravælg alle",
      selectAll: "Vælg alle",
      selected: (count: number) => `${count} valgt`,
      selectRow: (displayName: string) => `Vælg ${displayName}`,
    },
    title: "Virksomheder",
  },
  company: {
    bookingsTitle: "Bookinger",
    masterDataLink: "Virksomhedens oplysninger",
  },
  companyChangeReview: {
    after: "Efter",
    approve: "Godkend ændringer",
    approving: "Godkender …",
    before: "Før",
    description: "Kontrollér ændringerne, før du godkender dem.",
    emailChangeSent: (email: string) =>
      `Vi har sendt et separat bekræftelseslink til ${email}.`,
    errors: {
      failed:
        "Ændringerne kunne ikke godkendes. Bed virksomheden sende dem igen.",
      invalid: "Linket er ugyldigt, udløbet eller allerede brugt.",
    },
    fields: {
      attention: "Att.",
      billingAddress: "Faktureringsadresse",
      billingCity: "By",
      billingCountry: "Land",
      billingNotes: "Bemærkninger til fakturering",
      billingPostalCode: "Postnummer",
      contactName: "Primær kontaktperson",
      contactPhone: "Kontaktpersonens mobilnummer",
      cvrNumber: "CVR- eller VAT-nummer",
      department: "Afdeling",
      email: "Primær/login email",
      invoiceEmail: "Faktura-email",
      legalName: "Juridisk virksomhedsnavn",
      reference: "Reference",
    },
    invalid: "Linket er ugyldigt eller udløbet.",
    noChanges: "Der er ingen ændringer at vise.",
    success: "Ændringerne er godkendt.",
    title: "Godkend ændringer",
  },
  companyFields: {
    attention: "Att.",
    billingAddress: "Faktureringsadresse",
    billingCity: "By",
    billingCountry: "Land",
    billingNotes: "Bemærkninger til fakturering, fx EAN",
    billingPostalCode: "Postnummer",
    contactName: "Primær kontaktperson",
    contactPhone: "Kontaktpersonens mobilnummer",
    cvrNumber: "CVR- eller VAT-nummer",
    defaultCountry: "Danmark",
    department: "Afdeling",
    discountPercent: "Rabat i procent",
    displayName: "Visningsnavn",
    economicCustomerNumber: "Kundenummer i e-conomic",
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
    internalNote: "Intern note",
    invoiceEmail: "Faktura-email",
    legalName: "Juridisk virksomhedsnavn",
    membershipStatus: "Medlemsstatus",
    membershipStatusHint: {
      external:
        "Betaler fuld lokalepris. Oprettes uden invitation; du udfylder oplysningerne selv.",
      member: "Får rabat på lokaleleje og en invitation på mail.",
    },
    reference: "PO-nummer, reference eller omkostningssted",
  },
  companySettings: {
    changePending: (email: string) =>
      `Ændringerne afventer godkendelse på ${email} og er ikke aktive endnu.`,
    description:
      "I kan ændre virksomhedens oplysninger. Ændringerne skal godkendes fra den nuværende primære email.",
    emailHint:
      "Ændring af primær email kræver godkendelse fra både den nuværende og den nye email.",
    errors: {
      requestFailed:
        "Ændringerne kunne ikke sendes til godkendelse. Prøv igen.",
    },
    passwordLink: "Send link til ny adgangskode",
    passwordLinkSending: "Sender …",
    passwordLinkSent:
      "Linket til en ny adgangskode er sendt til den primære email.",
    save: "Gem ændringer",
    saving: "Sender …",
    securityTitle: "Adgangskode og sikkerhed",
    securityWarning:
      "Hvis du ændrer adgangskoden eller e-mailadressen, bliver alle aktive sessioner på virksomhedens fælles konto afsluttet. Virksomheden er selv ansvarlig for at informere medarbejderne om de nye loginoplysninger.",
    title: "Virksomhedsoplysninger",
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
      message: "Besked",
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
  forgotPassword: {
    backToLogin: "Tilbage til login",
    description: "Indtast virksomhedens primære email, så sender vi et link.",
    email: "Primær email",
    genericSuccess:
      "Hvis emailen hører til en virksomhed, sender vi et link til nulstilling af adgangskoden.",
    submit: "Send link",
    submitting: "Sender …",
    title: "Glemt adgangskode",
  },
  format: {
    exclVat: "ekskl. moms",
  },
  // Foyerskærmen (#124): the always-on display by the entrance — the
  // notice board and today's booking overview, no chrome, no booking.
  foyer: {
    title: "Velkommen til The Social House",
    updatedAt: "Senest opdateret",
  },
  // Hjem (#12, DESIGN.md "Hjem"): the notice board. Notices and today's
  // House Events, the day grid with each room's status, and the rooms.
  home: {
    blockLabel: (room: string, start: string, end: string, name: string) =>
      `${room}, ${start} til ${end}, ${name}`,
    buffer: "Buffer",
    dateLabel: "Dato",
    dayTitle: "Bookingoverblik",
    editNotices: "Rediger",
    gridLabel: (date: string) => `Lokaler den ${date}`,
    houseEventBadge: "House Event",
    houseEventWhen: (rooms: string, time: string) => `${rooms} · ${time}`,
    nextDay: "Næste dag",
    nextRooms: "Næste lokaler",
    // A heading of its own, so the weekday takes a capital: "Tirsdag 29/09/2026".
    noticesDate: (weekday: string, date: string) =>
      `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date}`,
    noticesTitle: "Opslagstavle",
    pickDate: "Vælg dato",
    previousDay: "Forrige dag",
    previousRooms: "Forrige lokaler",
    roomsTitle: "Lokaler",
    sheet: {
      booker: "Booker",
      bookerEmail: "Arbejdsemail",
      bookerPhone: "Mobilnummer",
      bookingNumber: "Bookingnummer",
      bookingTitle: "Booking",
      company: "Virksomhed",
      date: "Dato",
      description: "Forklaring",
      fullDay: "Hele dagen",
      houseEventTitle: "House Event",
      internalNote: "Intern note",
      participants: "Deltagere",
      practicalNotes: "Praktiske oplysninger",
      room: "Lokale",
      rooms: "Lokaler",
      status: "Status",
      time: "Tid",
      title: "Titel",
    },
    slotLabel: (room: string, time: string) => `Book ${room} kl. ${time}`,
    status: {
      closedToday: "Lukket for i dag",
      free: "Ledig nu",
      freeAt: (time: string) => `Ledig fra ${time}`,
      opensAt: (time: string) => `Åbner kl. ${time}`,
    },
  },
  // House Events (admin, #12, Bilag 1 "Kalender og opslagstavle"): date,
  // full day or a time span, the rooms it blocks, a title and a short
  // explanation. Title and explanation are member-visible. An event may
  // not overlap a booking, buffer included (decided in #12).
  houseEvents: {
    actions: {
      open: (title: string) => `Handlinger for ${title}`,
    },
    clearAll: "Fravælg alle",
    columns: {
      date: "Dato",
      rooms: "Lokaler",
      time: "Tid",
      title: "Titel",
    },
    conflictDescription:
      "Disse bookinger og House Events ligger i tidsrummet. De 30 minutters buffer efter en booking tæller med. Vælg et andet tidsrum eller andre lokaler.",
    conflictTitle: "Lokalerne er optaget",
    createButton: "Nyt House Event",
    createTitle: "Nyt House Event",
    delete: "Slet",
    deleteConfirm: "Ja, slet",
    deleted: "House Eventet er slettet",
    deleteSentence:
      "House Eventet slettes, og lokalerne kan bookes igen i tidsrummet.",
    deleteTitle: "Slet House Eventet?",
    deleting: "Sletter …",
    editLabel: "Rediger",
    editTitle: "Rediger House Event",
    emptyDescription:
      "Opret et House Event for at blokere lokaler til et internt arrangement.",
    emptyTitle: "Ingen House Events fra i dag og frem",
    errors: {
      conflict: "Lokalerne er optaget i tidsrummet.",
      conflictRace: "Et af lokalerne blev booket imens. Prøv igen.",
      dateRequired: "Vælg en dato.",
      deleteFailed: "House Eventet kunne ikke slettes. Prøv igen.",
      descriptionRequired: "Skriv en kort forklaring.",
      endAfterStart: "Sluttidspunktet skal ligge efter starttidspunktet.",
      roomsRequired: "Vælg mindst ét lokale.",
      saveFailed: "House Eventet kunne ikke gemmes. Prøv igen.",
      timeRequired: "Vælg et tidspunkt.",
      titleRequired: "Skriv en titel.",
      tooLong: "Teksten er for lang.",
    },
    fields: {
      date: "Dato",
      description: "Kort forklaring",
      end: "Slut",
      fullDay: "Hele dagen",
      rooms: "Lokaler",
      start: "Start",
      title: "Titel",
    },
    keep: "Fortryd",
    saved: "House Eventet er gemt",
    saving: "Gemmer …",
    selectAll: "Vælg alle",
    submit: "Gem",
    textSection: "Tekst til medlemmerne",
    title: "House Events",
    whenSection: "Tidspunkt og lokaler",
  },
  login: {
    copyEmail: "Kopiér emailadresse",
    email: "Email",
    emailChangedAlert: (email: string) =>
      `Din email er ændret til ${email}. Alle aktive sessioner er afsluttet – log ind med den nye email.`,
    emailCopied: "Emailadressen er kopieret.",
    emailCopyFailed: "Emailadressen kunne ikke kopieres. Prøv igen.",
    failed: "Forkert email eller adgangskode",
    forgotPassword: "Glemt adgangskode?",
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
    title: "Log ind",
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
    // Tab title: "… • The Social House" on every page (#65); the prefix is
    // the runtime, not part of the name (app/layout.tsx).
    title: "The Social House",
    titleSuffix: "The Social House",
  },
  notFound: {
    backHome: "Gå til forsiden",
    description: "Adressen er forkert, eller siden er blevet flyttet.",
    title: "Siden findes ikke",
  },
  // Notices (admin, #12): practical messages on the notice board. The
  // admin switches a notice on or off and may pick the last day it shows
  // (decided in #12). Every logged-in member sees the ones that are on.
  notices: {
    actions: {
      open: (title: string) => `Handlinger for ${title}`,
    },
    activate: "Slå til",
    clearLastDay: "Fjern dato",
    columns: {
      lastDay: "Vises til og med",
      status: "Status",
      title: "Titel",
    },
    contentSection: "Besked",
    createButton: "Nyt opslag",
    createTitle: "Nyt opslag",
    deactivate: "Slå fra",
    delete: "Slet",
    deleteConfirm: "Ja, slet",
    deleted: "Opslaget er slettet",
    deleteSentence: "Opslaget slettes og forsvinder fra forsiden.",
    deleteTitle: "Slet opslaget?",
    deleting: "Sletter …",
    editLabel: "Rediger",
    editTitle: "Rediger opslag",
    emptyDescription: "Opret et opslag for at vise en besked på forsiden.",
    emptyTitle: "Ingen opslag",
    errors: {
      bodyRequired: "Skriv en tekst.",
      deleteFailed: "Opslaget kunne ikke slettes. Prøv igen.",
      saveFailed: "Opslaget kunne ikke gemmes. Prøv igen.",
      statusFailed: "Opslaget kunne ikke opdateres. Prøv igen.",
      titleRequired: "Skriv en titel.",
      tooLong: "Teksten er for lang.",
    },
    fields: {
      body: "Tekst",
      isActive: "Vis på forsiden",
      lastDay: "Vis til og med",
      lastDayHint: "Uden dato vises opslaget, indtil du slår det fra.",
      title: "Titel",
    },
    keep: "Fortryd",
    noLastDay: "-",
    saved: "Opslaget er gemt",
    saving: "Gemmer …",
    status: {
      ended: "Udløbet",
      off: "Slået fra",
      shown: "Vises",
    },
    statusUpdated: "Opslaget er opdateret",
    submit: "Gem",
    title: "Opslag",
    visibilitySection: "Visning",
  },
  pagination: {
    next: "Næste side",
    previous: "Forrige side",
    rowsPerPage: "Rækker pr. side",
    summary: (from: number, to: number, total: number) =>
      `Viser ${from}–${to} af ${total}`,
  },
  rooms: {
    activate: "Aktiver",
    activateFailed: "Statussen kunne ikke ændres. Prøv igen.",
    activeColumn: "Status",
    activeLabel: "Aktiv",
    activeUpdated: "Status er opdateret",
    addonInactiveHint:
      "Dette tilkøb er deaktiveret og kan ikke knyttes til lokaler.",
    addonsSection: "Tilkøb",
    addonsSectionHint: 'Opret nye tilkøb under "Tilkøb".',
    basicSection: "Grundoplysninger",
    book: "Book nu",
    capacityChip: (capacity: number) => `1 - ${capacity} personer`,
    capacityColumn: "Kapacitet",
    chooseDate: "Vælg dato",
    createButton: "Opret lokale",
    createTitle: "Nyt lokale",
    deactivate: "Deaktiver",
    deactivatedNotice:
      "Lokalet er deaktiveret og kan ikke bookes. Historikken (bookinger og fakturagrundlag) er bevaret.",
    editButton: "Rediger",
    editLabel: "Rediger",
    editTitle: "Rediger lokale",
    emptyDescription: "Opret det første lokale for at gå i gang.",
    emptyTitle: "Ingen lokaler",
    errors: {
      capacityInteger: "Kapaciteten skal være et heltal.",
      capacityMin: "Kapaciteten skal være mindst 1.",
      closesAfterOpens:
        "Lukketid skal være efter åbningstid på alle åbne dage.",
      imageInvalid: "Vælg et gyldigt billede.",
      imageMaxCount: "Der kan højst tilføjes 10 billeder pr. lokale.",
      imageMaxCountAdded:
        "Lokalet kan højst have 10 billeder. De sidste {count} blev ikke tilføjet.",
      imageMaxSize: "Billedet er for stort. Maks. 5 MB.",
      imageMimeType: "Billedet skal være PNG, JPEG eller WebP.",
      nameMin: "Giv lokalet et navn.",
      priceMin: "Prisen kan ikke være negativ.",
      priceWholeKroner: "Indtast hele kroner uden decimaler.",
    },
    fields: {
      addOns: "Tilgængelige tilkøb",
      capacity: "Kapacitet",
      capacityHint: "Maks. antal deltagere",
      closed: "Lukket",
      closes: "Lukker",
      description: "Beskrivelse",
      images: "Billeder",
      location: "Etage/placering",
      name: "Navn",
      opens: "Åbner",
      practicalNotes: "Praktiske oplysninger",
      practicalNotesPlaceholder: "F.eks. udstyr i lokalet, adgang, oprydning …",
      price: "Timepris (kr., ekskl. moms)",
    },
    freeEmptyDescription: "Ingen ledige lokaler i det valgte tidsrum.",
    freeEmptyTitle: "Ingen ledige lokaler",
    freeTitle: "Ledige lokaler",
    imageActionFailed: "Billedet kunne ikke opdateres. Prøv igen.",
    imageAlt: "Billede af {name}",
    imageDelete: "Slet billede",
    imageDeleted: "Billedet er fjernet",
    imageDragHandle: "Træk for at sortere",
    imageEmpty: "Ingen billeder endnu",
    imagesHints: [
      "PNG, JPEG eller WebP.",
      "Maks. 5 MB pr. billede.",
      "Træk filer til feltet eller klik på feltet for at tilføje billeder.",
      "Træk i håndtaget på hvert billede for at ændre den viste rækkefølge.",
    ],
    imagesSection: "Billeder",
    imageUploadLabel: "Tilføj billeder",
    inactiveLabel: "Deaktiveret",
    listTitle: "Lokaler",
    nameColumn: "Navn",
    normalPrice: "Normalpris",
    notFound: "Lokalet findes ikke.",
    openingHoursSection: "Åbningstider",
    perHourSuffix: "/time",
    perParticipantSuffix: "/ person",
    persons: "personer",
    practicalNotesSection: "Praktiske oplysninger",
    priceColumn: "Timepris",
    pricesSection: "Pris og kapacitet",
    publicEmptyDescription: "Der er ingen lokaler at booke endnu.",
    publicEmptyTitle: "Ingen lokaler",
    save: "Gem",
    savedToast: "Lokalet er gemt",
    saveFailed: "Lokalet kunne ikke gemmes. Prøv igen.",
    saving: "Gemmer …",
    specialDayAdd: "Tilføj dato",
    specialDayClosed: "Lukket hele dagen",
    specialDayClosedLabel: "Lukket hele dagen",
    specialDayCloses: "Lukker",
    specialDayDate: "Dato",
    specialDayDelete: "Fjern datoen",
    specialDayDeleted: "Datoen er fjernet",
    specialDayDeleteFailed: "Datoen kunne ikke fjernes. Prøv igen.",
    specialDayDescription:
      "Vælg datoer hvor lokalet er lukket hele dagen eller har andre åbningstider end normalt – f.eks. helligdage eller vedligeholdelse.",
    specialDayEmpty: "Ingen lukkedage eller særlige åbningstider",
    specialDayEmptyDescription:
      "Lokalet følger de normale ugentlige åbningstider. Tilføj en dato, hvis lokalet skal være lukket eller have andre tider en bestemt dag.",
    specialDayHoursLabel: "Åbningstider på dagen",
    specialDayOpens: "Åbner",
    specialDayPickDate: "Vælg en dato først.",
    specialDaySaved: "Datoen er tilføjet",
    specialDaysTitle: "Lukkedage og særlige åbningstider",
    weekdays: [
      "Mandag",
      "Tirsdag",
      "Onsdag",
      "Torsdag",
      "Fredag",
      "Lørdag",
      "Søndag",
    ],
    yourPrice: "Din pris",
  },
  setPassword: {
    description: "Vælg den adgangskode, virksomheden logger ind med.",
    errors: {
      linkInvalid:
        "Linket er ugyldigt eller udløbet. Bed The Social House om et nyt link.",
      mismatch: "De to adgangskoder er ikke ens.",
      passwordMin: "Adgangskoden skal være mindst 8 tegn.",
      recoveryLinkInvalid:
        "Linket er udløbet. Prøv igen fra siden Glemt adgangskode.",
      samePassword: "Den nye adgangskode skal være forskellig fra den gamle.",
      saveFailed: "Adgangskoden kunne ikke gemmes. Prøv igen.",
    },
    password: "Adgangskode",
    passwordConfirm: "Gentag adgangskode",
    recoveryLink: "Gå til Glemt adgangskode",
    submit: "Gem adgangskode",
    submitting: "Gemmer …",
    title: "Vælg adgangskode",
  },
  settings: {
    copyPassword: "Klik for at kopiere adgangskoden",
    errors: {
      imageMaxSize: "Billedet er for stort. Maks. 5 MB.",
      imageMimeType: "Billedet skal være PNG, JPEG eller WebP.",
      required: "Feltet skal udfyldes.",
      saveFailed: "Indstillingerne kunne ikke gemmes. Prøv igen.",
      wifiNetworkMax: "Netværksnavnet må højst være 32 tegn.",
      wifiPasswordMax: "Adgangskoden må højst være 63 tegn.",
    },
    heroImageDescription:
      "Billedet i højre halvdel af de offentlige sider (log ind, glemt adgangskode m.m.). Uden et billede vises The Social House-logoet.",
    heroImageRemoved: "Billedet er fjernet",
    heroImageSection: "Offentligt billede",
    password: "Ny adgangskode",
    passwordConfirm: "Gentag ny adgangskode",
    passwordCopied: "Adgangskode kopieret",
    passwordDescription:
      "Ændrer admins adgangskode. Du forbliver logget ind efter ændringen.",
    passwordSaved: "Adgangskoden er ændret",
    passwordSection: "Adgangskode",
    pickImage: "Vælg billede",
    removeImage: "Fjern billede",
    saved: "Indstillingerne er gemt",
    saving: "Gemmer …",
    submit: "Gem",
    title: "Indstillinger",
    wifiNetwork: "Wi-Fi netværk",
    wifiPassword: "Wi-Fi adgangskode",
    wifiSection: "Wi-Fi",
  },
  shell: {
    adminGroup: "Admin",
    bookings: "Bookinger",
    bookRoom: "Book lokale",
    brand: "TheSocialHouse",
    companies: "Virksomheder",
    footer: {
      network: "TheSocialHouseguest",
      password: "SocialHouse",
      passwordLabel: "adgangskode",
    },
    home: "Hjem",
    menuSheetDescription: "Navigationsmenu",
    menuSheetTitle: "Menu",
    notices: "Opslag",
    openMenu: "Åbn menu",
    rooms: "Lokaler",
    settings: "Indstillinger",
    statistics: "Statistik",
    terms: "Betingelser",
    toggleSidebar: "Vis eller skjul sidepanel",
    // The member badge's read (#8): what the number beside Bookinger counts.
    upcomingBadge: "Vis kommende bookinger",
    upcomingBadgeTooltip: "Kommende bookinger",
    worklistBadge: "Vis bookinger der kan faktureres",
    worklistBadgeTooltip: "Bookinger der kan faktureres",
  },
  // Statistik (admin, #10, ADR-0014): the monthly booking economy across
  // every company. Only held bookings count; the rest of the month is
  // expected value and never part of the invoicing basis.
  statistics: {
    cancellations: {
      description: (year: string) => `Aflyste bookinger pr. måned i ${year}`,
      title: "Aflyste bookinger",
    },
    // Virksomheder (DESIGN.md "Statistik" 4): the companies that held the
    // most bookings in the month.
    companies: {
      columns: {
        basis: "Faktureringsgrundlag",
        bookings: "Bookinger",
        cancellations: "Aflyste",
        company: "Virksomhed",
        guestsAverage: "Deltagere pr. møde",
        hours: "Timer",
        share: "Af månedens omsætning",
      },
      description: (month: string, shown: number, total: number) =>
        shown < total
          ? `De ${shown} af ${total} virksomheder med flest afholdte bookinger i ${month}`
          : `Afholdte bookinger pr. virksomhed i ${month}`,
      emptyDescription:
        "Ingen virksomheder har afholdt eller aflyst en booking i måneden.",
      emptyTitle: "Ingen bookinger endnu",
      title: "Virksomheder",
    },
    economy: {
      addons: "Tilkøb",
      cancellationFees: "Afbestillingsgebyrer",
      description: (year: string) =>
        `Faktureringsgrundlag pr. måned i ${year}, ekskl. moms`,
      footnote:
        "Kun afholdte bookinger tæller med. Bookinger, der er markeret som ikke fakturerbare, tæller ikke med i beløbene.",
      manualAmounts: "Manuelle beløb",
      roomRent: "Lokaleleje efter rabat",
      title: "Bookingøkonomi",
    },
    expected: {
      bookings: (count: number) =>
        count === 1 ? "1 booking" : `${count} bookinger`,
      description:
        "Bookinger i måneden, der ikke er afholdt endnu. Beløbet kommer med i faktureringsgrundlaget, når mødet er slut.",
      title: "Forventet",
    },
    held: {
      description: (year: string) => `Afholdte bookinger pr. måned i ${year}`,
      title: "Bookinger",
    },
    kpi: {
      basis: "Faktureringsgrundlag",
      bookings: "Bookinger",
      cancellations: "Aflyste bookinger",
      roomHours: "Lokaletimer",
    },
    membership: {
      description: (month: string) => `Faktureringsgrundlag i ${month}`,
      emptyDescription:
        "Der er ingen afholdte bookinger med et beløb i måneden.",
      emptyTitle: "Intet faktureringsgrundlag endnu",
      external: "Eksterne virksomheder",
      member: "Medlemsvirksomheder",
      memberShare: "medlemmer",
      title: "Medlemmer og eksterne",
    },
    nextMonth: "Næste måned",
    previousMonth: "Forrige måned",
    // The comparison line under a number: "august 2026: 39.830,00 kr".
    previousValue: (month: string, value: string) => `${month}: ${value}`,
    // Lokaler (DESIGN.md "Statistik" 4): every room's held bookings and
    // share of opening time booked (booket af åbningstiden) in the month.
    rooms: {
      columns: {
        basis: "Faktureringsgrundlag",
        bookings: "Bookinger",
        hours: "Timer",
        occupancy: "Booket af åbningstiden",
        room: "Lokale",
      },
      description: (month: string) =>
        `Afholdte bookinger pr. lokale i ${month}`,
      emptyDescription: "Der er ingen afholdte bookinger i måneden.",
      emptyTitle: "Ingen bookinger endnu",
      footnote:
        "Booket af åbningstiden viser, hvor stor en del af lokalets åbningstid i måneden indtil nu der har været booket.",
      occupancyLabel: (room: string) => `Booket af åbningstiden for ${room}`,
      title: "Lokaler",
      total: (share: string) => `${share} af åbningstiden booket i alt`,
    },
  },
  // Booking terms, privacy policy, and GDPR overview (#15).
  terms: {
    admin: {
      description:
        "Teksterne vises for bookerne. Når du gemmer, bliver teksten offentliggjort som en ny version. De tidligere versioner bliver gemt, så du altid kan se, hvilken version en booker har accepteret.",
      errors: {
        contentRequired: "Skriv en tekst.",
        saveFailed: "Teksten kunne ikke offentliggøres. Prøv igen.",
        tooLong: "Teksten er for lang.",
        unchanged: "Teksten er ikke ændret.",
      },
      link: {
        apply: "Sæt link",
        href: "Webadresse",
        invalid:
          "Webadressen skal begynde med https://, http://, mailto: eller tel:.",
        remove: "Fjern link",
      },
      notPublished: "Ikke offentliggjort endnu",
      saved: "Den nye version er offentliggjort",
      saving: "Offentliggør …",
      submit: "Offentliggør ny version",
      title: "Betingelser",
      toolbar: {
        bold: "Fed",
        bulletList: "Punktopstilling",
        heading1: "Overskrift 1",
        heading2: "Overskrift 2",
        italic: "Kursiv",
        link: "Link",
        orderedList: "Nummereret liste",
        redo: "Gendan",
        undo: "Fortryd",
      },
      view: "Se den offentliggjorte version",
    },
    content: "Tekst",
    documents: {
      "Booking terms": "Bookingbetingelser",
      "GDPR overview": "Persondata",
      "Privacy policy": "Privatlivspolitik",
    },
    member: {
      title: "Betingelser og persondata",
    },
    version: (version: string, publishedOn: string) =>
      `Version ${version}, offentliggjort ${publishedOn}`,
  },
} as const;
