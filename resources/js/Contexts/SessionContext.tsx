import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { getSession, createSession as persistSession } from "../lib/storage";
import type { Role, Session } from "../types";

interface SessionContextValue {
  session: Session | null;
  login: (role: Role, name: string) => Session;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  const login = useCallback((role: Role, name: string) => {
    const next = persistSession(role, name);
    setSession(next);
    return next;
  }, []);

  return (
    <SessionContext.Provider value={{ session, login }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
