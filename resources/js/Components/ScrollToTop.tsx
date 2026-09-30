import { usePage } from "@inertiajs/react";
import { useEffect } from "react";

export function ScrollToTop() {
  const { url } = usePage();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [url]);

  return null;
}
