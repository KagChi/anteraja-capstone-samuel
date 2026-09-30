import { usePreloadedImage } from "./usePreloadedImage";

export function proofPhotoUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/960`;
}

export function useProofPhoto(seed: string | null | undefined) {
  return usePreloadedImage(seed ? proofPhotoUrl(seed) : null);
}
