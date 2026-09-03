// Danish UI copy (ADR-0016), keyed by feature (docs/agents/ui.md).
// Components import from here; no Danish string literals in components.
export const messages = {
  admin: {
    homeTitle: "Administration",
  },
  common: {
    signOut: "Log ud",
  },
  company: {
    bookingsTitle: "Bookinger",
  },
  login: {
    email: "Email",
    failed: "Forkert email eller adgangskode",
    invalidEmail: "Indtast en gyldig email",
    missingPassword: "Indtast adgangskoden",
    password: "Adgangskode",
    submit: "Log ind",
  },
} as const;
