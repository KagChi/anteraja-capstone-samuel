import { usePreloadedImage } from "./usePreloadedImage";

const AVATAR_STYLE = "initials";

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}

export function useAvatar(seed: string | null | undefined) {
  return usePreloadedImage(seed ? avatarUrl(seed) : null);
}
