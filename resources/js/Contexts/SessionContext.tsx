import { router, usePage } from "@inertiajs/react";
import type { AuthUser, Session } from "../types";

interface SessionContextValue {
  session: Session | null;
  user: AuthUser | null;
  logout: () => void;
}

/**
 * Reads the authenticated actor shared by `HandleInertiaRequests`.
 *
 * `usePage()` is only available inside the Inertia `App`, so this is a plain
 * hook rather than a React context provider.
 */
export function useSession(): SessionContextValue {
  const page = usePage();
  const auth = (page.props as { auth?: { user: AuthUser | null } | undefined })
    .auth;
  const user = auth?.user ?? null;

  const session: Session | null = user
    ? { role: user.role, name: user.name, at: 0 }
    : null;

  return {
    session,
    user,
    logout: () => router.post("/logout"),
  };
}
