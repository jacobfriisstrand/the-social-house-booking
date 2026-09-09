// beforeSend scrubber shared by the three Sentry runtimes (docs/agents/stack.md,
// Observability). Sentry must never see booker or company-contact data: the
// user object, request body and cookies are dropped, and every key named like
// a personal field is replaced wherever app code could have put one. SDK-owned
// subtrees (exception, stacktrace, sdk, device contexts) are left alone so
// `filename` and `browser.name` stay readable.
import type { ErrorEvent } from "@sentry/nextjs";

const FILTERED = "[Filtered]";
// Matches booker_email, company_contact_phone, booker_name,
// booking_practical_notes, booking_internal_note and their camelCase forms
// (ADR-0018 column prefixes).
const PERSONAL_KEY = /email|phone|name|practical_?notes|internal_?note/i;
const SECRET_HEADER = /^(authorization|cookie|set-cookie)$/i;
// Filled by the SDK with device facts, never with app data.
const SDK_CONTEXTS = new Set([
  "app",
  "browser",
  "cloud_resource",
  "culture",
  "device",
  "nextjs",
  "os",
  "react",
  "response",
  "runtime",
  "trace",
]);

const scrubValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(scrubValue) as T;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = PERSONAL_KEY.test(key) ? FILTERED : scrubValue(inner);
  }
  return out as T;
};

const scrubContexts = (
  contexts: ErrorEvent["contexts"]
): ErrorEvent["contexts"] => {
  if (!contexts) {
    return contexts;
  }
  const out: NonNullable<ErrorEvent["contexts"]> = {};
  for (const [name, context] of Object.entries(contexts)) {
    out[name] = SDK_CONTEXTS.has(name) ? context : scrubValue(context);
  }
  return out;
};

const scrubRequest = (
  request: ErrorEvent["request"]
): ErrorEvent["request"] => {
  if (!request) {
    return request;
  }
  const headers = request.headers
    ? Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          SECRET_HEADER.test(key) ? FILTERED : value,
        ])
      )
    : undefined;
  return { ...request, cookies: undefined, data: undefined, headers };
};

export const scrubEvent = (event: ErrorEvent): ErrorEvent => ({
  ...event,
  breadcrumbs: scrubValue(event.breadcrumbs),
  contexts: scrubContexts(event.contexts),
  extra: scrubValue(event.extra),
  request: scrubRequest(event.request),
  tags: scrubValue(event.tags),
  user: undefined,
});
