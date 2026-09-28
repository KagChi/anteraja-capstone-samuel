import { cn } from "../lib/cn";
import { initialOf } from "../lib/format";
import type { AsyncResource } from "../types";
import { Spinner } from "./ui/Spinner";

interface AvatarProps {
  name: string;
  resource: AsyncResource<string>;
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({
  name,
  resource,
  className,
  fallbackClassName,
}: AvatarProps) {
  const ready =
    Boolean(resource.data) && !resource.isLoading && !resource.isError;

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-magenta/10 text-[13px] font-bold text-brand-magenta ring-1 ring-border-subtle",
        className,
      )}
      aria-hidden="true"
    >
      {ready ? (
        <img
          src={resource.data ?? ""}
          alt=""
          className="size-full object-cover"
        />
      ) : resource.isLoading ? (
        <Spinner className="text-on-surface-variant/50" />
      ) : (
        <span className={fallbackClassName}>{initialOf(name, "S")}</span>
      )}
    </span>
  );
}
