import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block size-[1em] animate-spinner rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

interface LoadingButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "children"
  > {
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
  className,
  disabled,
  type = "button",
  ...rest
}: LoadingButtonProps) {
  const [busy, setBusy] = useState(false);
  const isDisabled = Boolean(disabled) || busy;

  return (
    <button
      {...rest}
      type={type}
      className={`${className ?? ""} ${busy ? "pointer-events-none" : ""}`}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      aria-disabled={isDisabled ? "true" : undefined}
      onClick={(event) => {
        event.preventDefault();
        if (isDisabled) return;
        setBusy(true);
        window.setTimeout(() => {
          onAction();
          if (!keepBusy) setBusy(false);
        }, delay);
      }}
    >
      {busy ? (
        <>
          <Spinner />
          <span>{busyText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface LoadingLinkProps {
  to: string;
  className?: string;
  disabled?: boolean;
  delay?: number;
  busyText?: string;
  onAction?: () => void;
  children: ReactNode;
  id?: string;
  "aria-label"?: string;
}

export function LoadingLink({
  to,
  className,
  disabled = false,
  delay = 900,
  busyText = "Memproses...",
  onAction,
  children,
  ...rest
}: LoadingLinkProps) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const isDisabled = disabled || busy;

  return (
    <Link
      {...rest}
      to={to}
      className={`${className ?? ""} ${isDisabled ? "pointer-events-none opacity-50" : ""}`}
      aria-busy={busy || undefined}
      aria-disabled={isDisabled ? "true" : undefined}
      onClick={(event) => {
        event.preventDefault();
        if (isDisabled) return;
        setBusy(true);
        window.setTimeout(() => {
          onAction?.();
          navigate(to);
        }, delay);
      }}
    >
      {busy ? (
        <>
          <Spinner />
          <span>{busyText}</span>
        </>
      ) : (
        children
      )}
    </Link>
  );
}
