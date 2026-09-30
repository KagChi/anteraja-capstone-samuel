import { useEffect, useRef } from "react";
import { useSession } from "../Contexts/SessionContext";
import { useToast } from "../Contexts/ToastContext";

export function useWelcomeToast(name: string): void {
  const show = useToast();
  const { session } = useSession();
  const shown = useRef(false);

  useEffect(() => {
    if (!session || shown.current) return;
    const timer = window.setTimeout(() => {
      shown.current = true;
      show(`Halo, ${name}! Selamat bekerja.`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [session, name, show]);
}
