import { useEffect, useRef } from "react";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";

export function useWelcomeToast(name: string): void {
  const show = useToast();
  const { session } = useSession();
  const shown = useRef(false);

  useEffect(() => {
    if (!session || shown.current) return;
    shown.current = true;
    const timer = window.setTimeout(() => {
      show(`Halo, ${name}! Selamat bekerja.`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [session, name, show]);
}
