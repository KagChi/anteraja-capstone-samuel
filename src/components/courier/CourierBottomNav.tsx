import { NavLink } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { COURIER_NAV_ITEMS } from "../../data/nav";
import { MaterialIcon } from "../MaterialIcon";

export function CourierBottomNav() {
  const toast = useToast();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-surface/90 pb-safe backdrop-blur-xl"
      aria-label="Navigasi utama kurir"
    >
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-around px-2 md:max-w-xl lg:max-w-3xl">
        {COURIER_NAV_ITEMS.map((item) => {
          if (item.stub) {
            return (
              <button
                key={item.label}
                type="button"
                className="flex flex-1 flex-col items-center justify-center py-1 font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                onClick={() => {
                  toast("Fitur ini belum tersedia pada purwarupa.", "error");
                }}
              >
                <MaterialIcon name={item.icon} className="text-[22px]" />
                <span className="mt-0.5 text-[10px]">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/courier/tugas"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
                  isActive
                    ? "font-semibold text-brand-magenta"
                    : "font-medium text-on-surface-variant hover:text-on-surface"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MaterialIcon
                    name={item.icon}
                    className="text-[22px]"
                    fill={isActive}
                  />
                  <span className="mt-0.5 text-[10px]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
