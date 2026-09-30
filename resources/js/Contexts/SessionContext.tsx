import { router } from "@inertiajs/react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { AuthUser, Session } from "../types";

interface SessionContextValue {
  session: Session | null;
  user: AuthUser | null;
  logout: () => void;
}

const AuthUserContext = createContext<AuthUser | null>(null);

/**
 * Holds the authenticated actor shared by `HandleInertiaRequests`.
 *
 * The user comes from the initial page props so the provider can sit above
 * the Inertia `App` (which owns `usePage`).
 */
export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
}) {
  return (
    <AuthUserContext.Provider value={initialUser}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const user = useContext(AuthUserContext);

  const session: Session | null = user
    ? { role: user.role, name: user.name, at: 0 }
    : null;

  return {
    session,
    user,
    logout: () => router.post("/logout"),
  };
}
