import { router, usePage } from "@inertiajs/react";
import type { AuthUser, Session } from "../types";

interface SessionContextValue {
  session: Session | null;
  user: AuthUser | null;
  logout: () => void;
}

interface PageProps {
  [key: string]: unknown;
  auth?: { user: AuthUser | null };
}

/**
 * Reads the authenticated actor from the current page's shared props, so a
 * client-side visit (login, logout, role switch) is reflected immediately
 * instead of freezing the value from the initial page load.
 */
export function useSession(): SessionContextValue {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user ?? null;

  const session: Session | null = user
    ? { role: user.role, name: user.name, at: 0 }
    : null;

  return {
    session,
    user,
    logout: () => router.post("/logout"),
  };
}
