Source: https://docs.sentry.io/organization/integrations/integration-platform/webhooks/ and https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issues/
Fetched: 2026-09-09

---

# Sentry webhooks (integration platform)

Condensed from the two pages above. Applies to the internal integration "TSH Booking GitHub issues" (slug `tsh-booking-github-issues-c4aeb3`, org `the-social-house`), created through `POST /api/0/sentry-apps/` with `events: ["issue"]`, `scopes: ["event:read"]`, `isAlertable: false`, `verifyInstall: false`.

## Request headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Request-ID` | unique id per delivery |
| `Sentry-Hook-Resource` | `installation`, `event_alert`, `issue`, `metric_alert`, `error`, `comment`, `seer`, `preprod_artifact` |
| `Sentry-Hook-Timestamp` | when the event happened |
| `Sentry-Hook-Signature` | hex HMAC-SHA256 of the request body, keyed with the integration's **Client Secret** |

Sentry's own sample re-serialises `request.body` with `JSON.stringify` before hashing. We hash the raw body text instead (`request.text()`), which is what Sentry actually signed; re-serialising only works while key order and whitespace happen to match.

"Webhooks should respond within 1 second. Otherwise, the response is considered a timeout." So respond first, do the work afterwards.

## Issue webhooks

`Sentry-Hook-Resource: issue`. `action` is one of `created`, `resolved`, `assigned`, `archived`, `unresolved` (the API lists the subscribed events as `issue.assigned`, `issue.created`, `issue.ignored`, `issue.resolved`, `issue.unresolved`). `created` fires once per Sentry issue, i.e. per error group, not per event.

Example payload for `created`:

```json
{
  "action": "created",
  "installation": { "uuid": "24b397fc-a86e-43ef-9297-949e21b82480" },
  "data": {
    "issue": {
      "url": "https://sentry.io/api/0/organizations/example-org/issues/1234567890/",
      "web_url": "https://example-org.sentry.io/issues/1234567890/",
      "project_url": "https://example-org.sentry.io/issues/?project=4509877862268928",
      "id": "1234567890",
      "shareId": null,
      "shortId": "PYTHON-Y",
      "title": "Error generated with event_id: 495d375a-1df6-45c0-9890-34dae8e1b6a4(Priority: HIGH)",
      "culprit": "test-transaction-0-41e49cd3-7252-441f-8d27-63a9ad697b0a",
      "permalink": "https://example-org.sentry.io/issues/1234567890/",
      "logger": "edge-function",
      "level": "fatal",
      "status": "unresolved",
      "statusDetails": {},
      "substatus": "new",
      "isPublic": false,
      "platform": "javascript",
      "project": { "id": "112313123123134", "name": "python", "slug": "python", "platform": "python" },
      "type": "default",
      "metadata": {
        "title": "Error generated with event_id: 495d375a-1df6-45c0-9890-34dae8e1b6a4(Priority: HIGH)",
        "sdk": { "name": "edge-function", "name_normalized": "other" },
        "severity": 1,
        "severity_reason": "log_level_fatal",
        "initial_priority": 75
      },
      "numComments": 0,
      "assignedTo": null,
      "isBookmarked": false,
      "isSubscribed": false,
      "subscriptionDetails": null,
      "hasSeen": false,
      "annotations": [],
      "issueType": "error",
      "issueCategory": "error",
      "priority": "high",
      "priorityLockedAt": null,
      "seerFixabilityScore": null,
      "seerAutofixLastTriggered": null,
      "isUnhandled": false,
      "count": "3",
      "userCount": 3,
      "firstSeen": "2025-11-10T20:56:00.679000+00:00",
      "lastSeen": "2025-11-10T20:56:00.738000+00:00"
    }
  },
  "actor": { "type": "application", "id": "example-app", "name": "Example App" }
}
```

The issue payload carries no `environment`; one Sentry project serves both environments, so the GitHub issue links to Sentry where the environment is visible.

## Internal integrations

Settings > Developer Settings > [the integration] shows the Client Secret and lets you rotate auth tokens (up to 20, no expiry). The API: `GET /api/0/sentry-apps/<slug>/` returns `clientSecret`; the org lives on the EU region, but the `sentry-apps` endpoints answer on `https://sentry.io`.
