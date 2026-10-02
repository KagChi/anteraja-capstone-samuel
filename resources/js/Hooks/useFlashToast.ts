import { usePage } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import { useToast } from "../Contexts/ToastContext";

interface FlashProps {
  flash?: {
    success?: string | null;
    error?: string | null;
  };
}

/**
 * Surfaces Laravel flash messages (e.g. the login confirmation) as a toast on
 * the page the redirect lands on. De-duplicates so it shows once per message.
 */
export function useFlashToast(): void {
  const show = useToast();
  const { flash } = usePage().props as FlashProps;
  const last = useRef<string | null>(null);

  useEffect(() => {
    const message = flash?.success ?? flash?.error;
    if (!message || message === last.current) return;
    last.current = message;
    show(message, flash?.error ? "error" : "ok");
  }, [flash, show]);
}
