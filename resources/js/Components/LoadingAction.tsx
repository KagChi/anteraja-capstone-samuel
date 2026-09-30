import { router } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button, type ButtonProps } from "./ui/Button";

export { Spinner } from "./ui/Spinner";

interface LoadingButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "busy"> {
  busyText?: string;
  delay?: number;
  onAction: () => void | Promise<void>;
  keepBusy?: boolean;
  children: ReactNode;
}

export function LoadingButton({
  busyText = "Memproses...",
  delay = 900,
  onAction,
  keepBusy = false,
  children,
  ...rest
}: LoadingButtonProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      {...rest}
      busy={busy}
      busyText={busyText}
      onClick={(event) => {
        event.preventDefault();
        if (busy || rest.disabled) return;
        setBusy(true);
        window.setTimeout(async () => {
          try {
            await onAction();
          } catch {
            /* caller surfaces the error via toast */
          } finally {
            if (!keepBusy) setBusy(false);
          }
        }, delay);
      }}
    >
      {children}
    </Button>
  );
}

interface LoadingLinkProps
  extends Omit<ButtonProps, "onClick" | "children" | "busy" | "as" | "href"> {
  to: string;
  delay?: number;
  busyText?: string;
  onAction?: () => void | Promise<void>;
  children: ReactNode;
}

export function LoadingLink({
  to,
  delay = 900,
  busyText = "Memproses...",
  onAction,
  children,
  ...rest
}: LoadingLinkProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      {...rest}
      as="link"
      to={to}
      busy={busy}
      busyText={busyText}
      onClick={(event) => {
        event.preventDefault();
        if (busy || rest.disabled) return;
        setBusy(true);
        window.setTimeout(async () => {
          try {
            await onAction?.();
          } catch {
            setBusy(false);
            return;
          }
          router.visit(to);
        }, delay);
      }}
    >
      {children}
    </Button>
  );
}
