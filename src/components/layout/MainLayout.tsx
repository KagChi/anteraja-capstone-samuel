import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { MaterialIcon } from "../MaterialIcon";

interface RouteMeta {
  title: string;
  back?: string;
}

function resolveMeta(pathname: string): RouteMeta {
  if (pathname === "/shipments") return { title: "Lacak Resi", back: "/" };
  if (pathname.startsWith("/shipments/"))
    return { title: "Detail Resi", back: "/shipments" };
  return { title: "Tidak Ditemukan", back: "/" };
}

const HEADER_NAV = [
  { label: "Beranda", to: "/", end: true },
  { label: "Resi", to: "/shipments", end: false },
];

export function MainLayout() {
  const { pathname } = useLocation();

  // The courier screens keep their own chrome, so the shell passes through.
  if (pathname.startsWith("/courier/")) {
    return <Outlet />;
  }

  const { title, back } = resolveMeta(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-lg focus:bg-brand-magenta focus:px-4 focus:py-2 focus:text-white"
        href="#konten-utama"
      >
        Lewati ke konten
      </a>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.06] bg-surface/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-4 md:max-w-xl lg:max-w-3xl">
          {back ? (
            <Link
              className="grid size-8 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
              to={back}
              aria-label="Kembali"
            >
              <MaterialIcon name="arrow_back_ios_new" className="text-[18px]" />
            </Link>
          ) : (
            <Link
              className="flex items-center"
              to="/"
              aria-label="Kembali ke beranda"
            >
              <img
                className="h-6 w-auto"
                src="/logo-anteraja.png"
                alt="Anteraja"
              />
            </Link>
          )}

          <span className="truncate text-[15px] font-semibold tracking-tight text-on-surface">
            {title}
          </span>

          <nav
            className="ml-auto flex items-center gap-1"
            aria-label="Navigasi utama"
          >
            {HEADER_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1 text-[12px] transition-colors ${
                    isActive
                      ? "bg-surface-container font-semibold text-brand-magenta"
                      : "font-medium text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:max-w-xl lg:max-w-3xl"
        id="konten-utama"
      >
        <Outlet />
      </main>

      <footer className="border-t border-border-subtle px-4 py-6">
        <p className="mx-auto max-w-md text-[11px] text-on-surface-variant/70 md:max-w-xl lg:max-w-3xl">
          Anteraja Instant &bull; Satria Rapid Field Dispatch &bull; Data contoh
          untuk keperluan purwarupa.
        </p>
      </footer>
    </div>
  );
}
