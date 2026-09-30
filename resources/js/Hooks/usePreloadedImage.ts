import { useCallback, useEffect, useState } from "react";
import type { AsyncResource } from "../types";

export function usePreloadedImage(url: string | null): AsyncResource<string> {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce forces a manual reload via reload()
  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    const image = new Image();
    setIsLoading(true);
    setError(null);

    image.onload = () => {
      if (!active) return;
      setData(url);
      setIsLoading(false);
    };
    image.onerror = () => {
      if (!active) return;
      setError(new Error("Gagal memuat gambar"));
      setIsLoading(false);
    };
    image.src = url;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, isLoading, isError: error !== null, error, reload };
}
