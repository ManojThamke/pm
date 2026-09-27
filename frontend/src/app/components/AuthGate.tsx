"use client";

import { useEffect, useState } from "react";
import { clearSession, readSession, type AuthenticatedUser } from "@/lib/auth";
import { SignInForm } from "./SignInForm";
import { KanbanBoard } from "@/components/KanbanBoard";

export const AuthGate = () => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(readSession(window.localStorage));
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
        onSignedIn={() => setUser({ username: "user" })}
      />
    );
  }

  return (
    <KanbanBoard
      username={user.username}
      onLogout={() => {
        clearSession(window.localStorage);
        setUser(null);
      }}
    />
  );
};
