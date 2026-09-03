"use client";

// Centred login card, outside the shell (docs/design/DESIGN.md). Email is the
// login credential; errors come from the server action through useActionState.
import { useActionState } from "react";
import { type LoginState, logIn } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(logIn, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <h1 className="mb-6 font-semibold text-3xl">The Social House</h1>
        <form action={formAction} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm">{messages.login.email}</span>
            <input
              autoComplete="email"
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">{messages.login.password}</span>
            <input
              autoComplete="current-password"
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              name="password"
              required
              type="password"
            />
          </label>
          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          <button
            className="h-9 rounded-lg bg-primary font-medium text-primary-foreground text-sm"
            type="submit"
          >
            {messages.login.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
