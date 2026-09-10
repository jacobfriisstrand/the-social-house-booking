import { describe, expect, it } from "vitest";
import { emailTemplates } from "@/emails/templates/registry";
import {
  buildActionUrl,
  escapeHtml,
  hookPayload,
  invitationVariables,
  planEmail,
  redactRecipient,
  resolveRecipients,
  senderAddress,
} from "./handler";

const MISSING_REDIRECT_TARGET = /EMAIL_REDIRECT_TO/;

const invitePayload = {
  email_data: {
    email_action_type: "invite",
    redirect_to: "http://localhost:3000/",
    site_url: "http://localhost:3000/",
    token: "",
    token_hash: "abc+def/123=",
  },
  user: {
    aud: "authenticated",
    email: "kontakt@rituals.dk",
    id: "00000000-0000-0000-0000-000000000002",
  },
};

describe("hookPayload", () => {
  it("keeps the fields the hook uses and drops the rest", () => {
    const parsed = hookPayload.parse(invitePayload);
    expect(parsed).toEqual({
      email_data: {
        email_action_type: "invite",
        site_url: "http://localhost:3000/",
        token_hash: "abc+def/123=",
      },
      user: {
        email: "kontakt@rituals.dk",
        id: "00000000-0000-0000-0000-000000000002",
      },
    });
  });

  it("rejects a payload without token_hash", () => {
    const { token_hash: _omitted, ...emailData } = invitePayload.email_data;
    expect(
      hookPayload.safeParse({ ...invitePayload, email_data: emailData }).success
    ).toBe(false);
  });
});

describe("buildActionUrl", () => {
  it("points at set-password with the encoded token and type", () => {
    expect(buildActionUrl(hookPayload.parse(invitePayload).email_data)).toBe(
      "http://localhost:3000/set-password?token_hash=abc%2Bdef%2F123%3D&type=invite"
    );
  });
});

describe("planEmail", () => {
  it("maps invite to the company-invitation template", () => {
    expect(planEmail(hookPayload.parse(invitePayload))).toEqual({
      actionUrl:
        "http://localhost:3000/set-password?token_hash=abc%2Bdef%2F123%3D&type=invite",
      authUserId: "00000000-0000-0000-0000-000000000002",
      kind: "company-invitation",
      status: "send",
      to: "kontakt@rituals.dk",
    });
  });

  it.each(["recovery", "email_change", "signup", "magiclink"])(
    "rejects %s until a template maps it",
    (type) => {
      const payload = hookPayload.parse({
        ...invitePayload,
        email_data: { ...invitePayload.email_data, email_action_type: type },
      });
      expect(planEmail(payload)).toEqual({
        reason: `unsupported email_action_type "${type}"`,
        status: "reject",
      });
    }
  );
});

describe("resolveRecipients", () => {
  it("sends to the real recipient only in production", () => {
    expect(resolveRecipients("a@b.dk", { APP_ENV: "production" })).toEqual([
      "a@b.dk",
    ]);
  });

  it("redirects in development and when APP_ENV is unset", () => {
    const env = { EMAIL_REDIRECT_TO: "qa@example.com, dev@example.com" };
    expect(
      resolveRecipients("a@b.dk", { ...env, APP_ENV: "development" })
    ).toEqual(["qa@example.com", "dev@example.com"]);
    expect(resolveRecipients("a@b.dk", env)).toEqual([
      "qa@example.com",
      "dev@example.com",
    ]);
  });

  it("refuses to send outside production without a redirect target", () => {
    expect(() =>
      resolveRecipients("a@b.dk", { APP_ENV: "development" })
    ).toThrow(MISSING_REDIRECT_TARGET);
  });
});

describe("invitationVariables", () => {
  it("escapes HTML and satisfies the template's variable schema", () => {
    const variables = invitationVariables(
      "http://localhost:3000/set-password?token_hash=x&type=invite",
      'Rituals & <Co> "ApS"'
    );
    expect(variables).toEqual({
      ACTION_URL:
        "http://localhost:3000/set-password?token_hash=x&amp;type=invite",
      COMPANY_DISPLAY_NAME: "Rituals &amp; &lt;Co&gt; &quot;ApS&quot;",
    });
    expect(
      emailTemplates["company-invitation"]?.variables.safeParse(variables)
        .success
    ).toBe(true);
  });
});

describe("helpers", () => {
  it("extracts the bare sender address", () => {
    expect(senderAddress("The Social House <booking@example.com>")).toBe(
      "booking@example.com"
    );
    expect(senderAddress(" booking@example.com ")).toBe("booking@example.com");
  });

  it("escapes every HTML special", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("redacts the recipient from error text", () => {
    expect(redactRecipient("bad address a@b.dk", "a@b.dk")).toBe(
      "bad address [recipient]"
    );
  });
});
