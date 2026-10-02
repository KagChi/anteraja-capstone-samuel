import type { ComponentPropsWithRef } from "react";
import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";

interface TextFieldProps extends ComponentPropsWithRef<"input"> {
  label?: string;
  icon?: string;
}

/** Canonical form input: 44px tall, 1px subtle border, magenta focus. */
export function TextField({
  label,
  icon,
  className,
  ref,
  ...rest
}: TextFieldProps) {
  return (
    <label className={cn("relative block w-full min-w-0", className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      {icon ? (
        <MaterialIcon
          name={icon}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
        />
      ) : null}
      <input
        className={cn(
          "h-11 w-full rounded-xl border border-border-subtle bg-surface-container-low text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-brand-magenta focus:outline-none focus:ring-0",
          icon ? "pl-9 pr-3" : "px-3",
        )}
        ref={ref}
        {...rest}
      />
    </label>
  );
}
