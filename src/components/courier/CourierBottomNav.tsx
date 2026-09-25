import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { COURIER_NAV_ITEMS } from "../../data/nav";
import { MaterialIcon } from "../MaterialIcon";

interface CourierBottomNavProps {
  variant?: "default" | "sukses";
  activeLabel?: string;
}

export function CourierBottomNav({
  variant = "default",
  activeLabel,
}: CourierBottomNavProps) {
  const toast = useToast();

  const navClass =
    variant === "sukses"
      ? "fixed bottom-0 z-50 w-full border-t border-border-subtle bg-surface/90 pb-safe backdrop-blur-md"
      : "fixed bottom-0 z-40 w-full border-t border-black/[0.08] bg-surface/90 pb-safe backdrop-blur-xl";
  const innerClass =
    variant === "sukses"
      ? "mx-auto flex h-16 max-w-md items-center justify-around px-2 m-0"
      : "mx-auto flex h-14 max-w-md items-center justify-around px-2 m-0";

  return (
    <nav className={navClass} aria-label="Navigasi utama kurir">
      <p className={innerClass}>
        {COURIER_NAV_ITEMS.map((item) => {
          const isActive = item.label === activeLabel;
          const itemClass =
            variant === "sukses"
              ? `flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 ${
                  isActive
                    ? "font-semibold text-brand-magenta"
                    : "text-on-surface-variant transition-colors hover:text-brand-magenta"
                }`
              : `flex flex-1 flex-col items-center justify-center py-1 ${
                  isActive
                    ? "text-brand-magenta"
                    : "text-on-surface-variant hover:text-on-surface"
                }`;

          if (item.stub) {
            return (
              <button
                key={item.label}
                type="button"
                className={itemClass}
                onClick={() => {
                  toast("Fitur ini belum tersedia pada purwarupa.", "error");
                }}
              >
                <MaterialIcon name={item.icon} className="text-[22px]" />
                <span
                  className={
                    variant === "sukses"
                      ? "text-[10px]"
                      : `mt-0.5 text-[10px] ${isActive ? "font-semibold" : "font-medium"}`
                  }
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              className={itemClass}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
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
            </Link>
          );
        })}
      </p>
    </nav>
  );
}
