import { type InertiaLinkProps, Link } from "@inertiajs/react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "text"
  | "textNeutral"
  | "textInverse"
  | "icon"
  | "iconInverse"
  | "tab"
  | "segment"
  | "nav";

export type ButtonSize = "sm" | "md" | "lg" | "xl";
export type ButtonShape = "default" | "pill";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  as?: "button" | "a" | "link";
  to?: string;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  active?: boolean;
  busy?: boolean;
  busyText?: string;
  onClick?: (event: MouseEvent<Element>) => void;
}

const VARIANT_BASE: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center bg-brand-magenta font-bold text-on-primary shadow-sm transition-all hover:bg-primary active:scale-[0.99]",
  secondary:
    "inline-flex items-center justify-center bg-surface-container font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container-high",
  outline:
    "inline-flex items-center justify-center border border-border-subtle font-semibold text-on-surface-variant transition-colors hover:bg-surface-container",
  ghost:
    "inline-flex items-center justify-center font-medium transition-colors",
  text: "inline-flex items-center gap-1 font-semibold text-brand-magenta transition-opacity hover:opacity-80",
  textNeutral:
    "inline-flex items-center gap-1 font-semibold text-on-surface-variant transition-colors hover:text-on-surface",
  textInverse:
    "inline-flex items-center gap-1 font-semibold text-white/70 transition-colors hover:text-white",
  icon: "inline-grid place-items-center text-on-surface-variant transition-colors hover:bg-surface-container",
  iconInverse:
    "inline-grid place-items-center text-white/90 transition-all hover:bg-white/20",
  tab: "flex items-center transition-all",
  segment: "flex items-center transition-all",
  nav: "flex flex-col items-center justify-center transition-colors",
};

const SOLID_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-[13px]",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-5 text-[15px]",
  xl: "h-[52px] gap-2 px-5 text-[15px]",
};

const SOLID_ROUND: Record<ButtonSize, string> = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-xl",
  xl: "rounded-xl",
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
  xl: "size-10",
};

function resolveClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  shape: ButtonShape,
  active: boolean,
): string {
  const base = VARIANT_BASE[variant];

  if (
    variant === "primary" ||
    variant === "secondary" ||
    variant === "outline" ||
    variant === "ghost"
  ) {
    return cn(
      base,
      SOLID_SIZE[size],
      shape === "pill" ? "rounded-full" : SOLID_ROUND[size],
    );
  }

  if (variant === "icon" || variant === "iconInverse") {
    return cn(
      base,
      ICON_SIZE[size],
      shape === "pill" ? "rounded-full" : "rounded-lg",
    );
  }

  if (variant === "tab" || variant === "segment") {
    return cn(
      base,
      active
        ? "bg-surface-container-lowest font-semibold text-brand-magenta shadow-sm"
        : "font-medium text-on-surface-variant hover:text-on-surface",
    );
  }

  if (variant === "nav") {
    return cn(
      base,
      active
        ? "font-semibold text-brand-magenta"
        : "font-medium text-on-surface-variant hover:text-on-surface",
    );
  }

  return base;
}

export function Button({
  as = "button",
  to,
  href,
  variant = "primary",
  size = "md",
  shape = "default",
  active = false,
  busy = false,
  busyText,
  disabled = false,
  className,
  children,
  onClick,
  type,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || busy;
  const classes = cn(
    resolveClasses(variant, size, shape, active),
    isDisabled && "pointer-events-none opacity-50",
    className,
  );

  const aria = {
    "aria-busy": busy || undefined,
    "aria-disabled": isDisabled || undefined,
    ...(variant === "tab"
      ? { role: "tab" as const, "aria-selected": active }
      : {}),
    ...(variant === "nav" && active ? { "aria-current": "page" as const } : {}),
  };

  const handleClick = (event: MouseEvent<Element>) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content: ReactNode = busy ? (
    <>
      <Spinner />
      <span>{busyText}</span>
    </>
  ) : (
    children
  );

  const linkRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;

  if (as === "link" && to) {
    const linkProps = {
      href: to,
      className: classes,
      ...aria,
      ...rest,
      onClick: handleClick,
    } as unknown as InertiaLinkProps;

    return <Link {...linkProps}>{content}</Link>;
  }

  if (as === "a" && href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={handleClick}
        {...aria}
        {...linkRest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={isDisabled}
      onClick={handleClick}
      {...aria}
      {...rest}
    >
      {content}
    </button>
  );
}
