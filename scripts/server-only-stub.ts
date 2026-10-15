// Vitest stands in for the `server-only` package: rendering a client
// component (e.g. the day grid) in node pulls server modules whose
// import-time guard would otherwise throw. The alias lives in
// vitest.config.mts.
export {};
