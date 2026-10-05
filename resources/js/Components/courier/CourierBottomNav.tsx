import { COURIER_NAV_ITEMS } from "../../data/nav";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "../ui/Button";

interface CourierBottomNavProps {
  variant?: "default" | "sukses";
  activeLabel?: string;
}

export function CourierBottomNav({
  variant = "default",
  activeLabel,
}: CourierBottomNavProps) {
  const navClass =
    variant === "sukses"
      ? "fixed bottom-0 z-50 w-full border-t border-border-subtle bg-surface/90 pb-safe backdrop-blur-md"
      : "fixed bottom-0 z-40 w-full border-t border-black/[0.08] bg-surface/90 pb-safe backdrop-blur-xl";
  const innerClass =
    variant === "sukses"
      ? "mx-auto flex h-16 max-w-md items-center justify-around px-2 m-0"
      : "mx-auto flex h-14 max-w-md items-center justify-around px-2 m-0";

  const itemClass =
    variant === "sukses" ? "gap-1 min-h-[48px] min-w-[64px]" : "flex-1 py-1";

  return (
    <nav className={navClass} aria-label="Navigasi utama kurir">
      <p className={innerClass}>
        {COURIER_NAV_ITEMS.map((item) => {
          const isActive = item.label === activeLabel;

          return (
            <Button
              key={item.label}
              as="link"
              to={item.to}
              variant="nav"
              active={isActive}
              className={itemClass}
            >
              <MaterialIcon
                name={item.icon}
                className="text-[22px]"
                fill={variant === "sukses" && isActive}
              />
              <span
                className={
                  variant === "sukses"
                    ? "text-[10px]"
                    : `mt-0.5 text-[10px] ${isActive ? "font-semibold" : "font-medium"}`
                }
              >
                {item.label}
              </span>
            </Button>
          );
        })}
      </p>
    </nav>
  );
}
