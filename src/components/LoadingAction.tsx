import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, type ButtonProps } from "./ui/Button";

export { Spinner } from "./ui/Spinner";

interface LoadingButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "busy"> {
  busyText?: string;
  delay?: number;
  onAction: () => void;
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
        window.setTimeout(() => {
          onAction();
          if (!keepBusy) setBusy(false);
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
  onAction?: () => void;
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
  const navigate = useNavigate();

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
        window.setTimeout(() => {
          onAction?.();
          navigate(to);
        }, delay);
      }}
    >
      {children}
    </Button>
  );
}
