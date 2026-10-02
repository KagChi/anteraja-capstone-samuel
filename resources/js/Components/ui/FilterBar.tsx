import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

interface FilterBarProps {
  children: ReactNode;
  label?: string;
}

/**
 * Shared filter toolbar for admin data tables. Stacks the tab strip and the
 * search group until there is room for a single row, so nothing gets clipped
 * inside the table card.
 */
export function FilterBar({
  children,
  label = "Filter dan pencarian",
}: FilterBarProps) {
  return (
    <section
      className="flex w-full min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between"
      aria-label={label}
    >
      {children}
    </section>
  );
}

interface FilterTabsProps {
  id: string;
  label: string;
  /** Equal-width segments (mobile filter bars) instead of content-width pills. */
  fill?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Segmented filter strip: one shared recipe for admin toolbars and mobile
 * filter bars. Labels stay on one line and scroll instead of wrapping.
 */
export function FilterTabs({
  id,
  label,
  fill = false,
  className,
  children,
}: FilterTabsProps) {
  return (
    <fieldset
      className={cn(
        "flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-lg border-0 bg-surface-container p-1",
        !fill && "2xl:w-auto 2xl:shrink-0",
        className,
      )}
      id={id}
    >
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

type FilterTabProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "className"
> & {
  active: boolean;
  /** Stretch to fill the strip evenly (mobile filter bars). */
  grow?: boolean;
};

export function FilterTab({
  active,
  grow = false,
  children,
  ...rest
}: FilterTabProps) {
  return (
    <Button
      variant="segment"
      active={active}
      aria-pressed={active}
      className={cn(
        "gap-1.5 rounded-md px-3.5 py-1.5 text-label-md",
        grow
          ? "min-w-0 flex-1 whitespace-nowrap"
          : "shrink-0 whitespace-nowrap",
      )}
      {...rest}
    >
      {children}
    </Button>
  );
}

interface FilterSearchProps {
  children: ReactNode;
}

/** Search input plus filter controls; wraps instead of overflowing. */
export function FilterSearch({ children }: FilterSearchProps) {
  return (
    <search className="flex w-full min-w-0 flex-wrap items-center gap-space-sm 2xl:w-auto 2xl:flex-1 2xl:justify-end">
      {children}
    </search>
  );
}

interface SearchFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  className,
}: SearchFieldProps) {
  return (
    <label
      className={cn(
        "relative block w-full min-w-0 sm:flex-[1_1_14rem] 2xl:flex-[0_1_16rem]",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <MaterialIcon
        name="search"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
      />
      <input
        className="w-full rounded-lg border-0 bg-surface-container-low py-3 pl-9 pr-3 text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:outline-none"
        id={id}
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
