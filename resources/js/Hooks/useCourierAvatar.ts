import { usePage } from "@inertiajs/react";
import type { AsyncResource, AuthUser } from "../types";
import { useAvatar } from "./useAvatar";

interface PageProps {
  [key: string]: unknown;
  auth?: { user: AuthUser | null };
}

/**
 * Avatar for the signed-in actor, derived from the current page props so it
 * follows client-side visits (login/logout) without extra state.
 */
export function useCourierAvatar(): AsyncResource<string> {
  const { props } = usePage<PageProps>();

  return useAvatar(props.auth?.user?.name);
}
