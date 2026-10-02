import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Spinner } from "./Spinner";

interface StatusPanelProps {
  children: ReactNode;
  icon?: string;
  spinning?: boolean;
  tone?: "default" | "error";
  action?: ReactNode;
  as?: "p" | "li";
  className?: string;
}

/**
 * Shared loading / empty / error block: dashed frame with optional spinner or
 * icon, message text, and an optional follow-up action.
 */
export function StatusPanel({
  children,
  icon,
  spinning = false,
  tone = "default",
  action,
  as: Tag = "p",
  className,
}: StatusPanelProps) {
  return (
    <Tag
      className={cn(
        "m-0 flex flex-col items-center gap-2 rounded-md border border-dashed border-border-subtle bg-surface-card px-4 py-10 text-center text-body-sm text-on-surface-variant",
        className,
      )}
    >
      {spinning ? <Spinner /> : null}
      {icon ? (
        <MaterialIcon
          name={icon}
          className={cn(
            "text-[32px]",
            tone === "error"
              ? "text-alert-amber"
              : "text-on-surface-variant/40",
          )}
        />
      ) : null}
      <span className="inline-flex flex-wrap items-center justify-center gap-1">
        {children}
      </span>
      {action}
    </Tag>
  );
}
