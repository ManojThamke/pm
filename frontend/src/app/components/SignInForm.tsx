"use client";

import { FormEvent, useState } from "react";
import { validateCredentials, writeAuthorization, writeSession, type StorageLike } from "@/lib/auth";

type SignInFormProps = {
  storage: StorageLike;
  onSignedIn: () => void;
  authorizationStorage?: StorageLike;
};

export const SignInForm = ({ storage, onSignedIn, authorizationStorage }: SignInFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const user = validateCredentials(username, password);
    if (!user) {
      setError("The username or password is incorrect.");
      setIsSubmitting(false);
      return;
    }

    writeSession(storage, user);
    writeAuthorization(
      authorizationStorage ?? storage,
      `Basic ${btoa(`${username}:${password}`)}`
    );
    onSignedIn();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white/90 p-8 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Project workspace
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
          Sign in to Kanban Studio
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Use your workspace credentials to continue.
        </p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[var(--navy-dark)]">
            Username
            <input
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-4 py-3"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-[var(--navy-dark)]">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-4 py-3"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            className="w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-3 font-semibold text-white"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
};
