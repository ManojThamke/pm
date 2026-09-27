"use client";

import { useEffect, useState } from "react";
import {
  clearAuthorization,
  clearSession,
  readAuthorization,
  readSession,
  type AuthenticatedUser,
} from "@/lib/auth";
import { SignInForm } from "./SignInForm";
import { KanbanBoard } from "@/components/KanbanBoard";

export const AuthGate = () => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authorization, setAuthorization] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(readSession(window.localStorage));
      setAuthorization(readAuthorization(window.sessionStorage));
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <main aria-label="Loading" className="min-h-screen" />;
  }

  if (!user) {
    return (
      <SignInForm
        storage={window.localStorage}
        authorizationStorage={window.sessionStorage}
        onSignedIn={() => {
          setUser({ username: "user" });
          setAuthorization(readAuthorization(window.sessionStorage));
        }}
      />
    );
  }

  return (
    <KanbanBoard
      username={user.username}
      authorization={authorization ?? undefined}
      onLogout={() => {
        clearSession(window.localStorage);
        clearAuthorization(window.sessionStorage);
        setUser(null);
        setAuthorization(null);
      }}
    />
  );
};
