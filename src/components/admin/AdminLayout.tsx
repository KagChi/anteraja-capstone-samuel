import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { ADMIN_NAV_GROUPS } from "../../data/nav";
import { initialOf } from "../../lib/format";
import { MaterialIcon } from "../MaterialIcon";

interface Crumb {
  section: string;
  sectionHref?: string;
  current: string;
  activeNav: string;
}

const CRUMBS: Record<string, Crumb> = {
  "/admin/dashboard": {
    section: "Operasional Harian",
    current: "Daftar Pengiriman",
    activeNav: "/admin/dashboard",
  },
  "/admin/audit-trail": {
    section: "Operasional Harian",
    sectionHref: "/admin/dashboard",
    current: "Detail Audit Trail",
    activeNav: "/admin/dashboard",
  },
  "/admin/antrian-pengecualian": {
    section: "Operasional Harian",
    sectionHref: "/admin/dashboard",
    current: "Antrian Pengecualian",
    activeNav: "/admin/antrian-pengecualian",
  },
  "/admin/pengecualian-detail": {
    section: "Operasional Harian",
    current: "Antrian Pengecualian",
    activeNav: "/admin/antrian-pengecualian",
  },
  "/admin/pengaturan-radius": {
    section: "Konfigurasi Sistem",
    current: "Pengaturan Radius",
    activeNav: "/admin/pengaturan-radius",
  },
};

export function AdminLayout() {
  const { pathname } = useLocation();
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  const name = session?.name ?? "Hub Admin Ops";
  const crumb = CRUMBS[pathname] ?? CRUMBS["/admin/dashboard"];

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-on-surface antialiased">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-lg focus:bg-brand-magenta focus:px-4 focus:py-2 focus:text-white"
        href="#konten-utama"
      >
        Lewati ke konten
      </a>

      <span
        id="sidebar-backdrop"
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${open ? "" : "hidden"}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <div className="min-h-screen lg:flex">
        <aside
          id="admin-sidebar"
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-subtle bg-surface-container-lowest transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Navigasi konsol admin"
        >
          <p className="m-0 flex h-16 shrink-0 items-center gap-2.5 border-b border-border-subtle px-5">
            <img
              className="h-6 w-auto"
              src="/logo-anteraja.png"
              alt="Anteraja"
            />
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Hub
            </span>
          </p>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {ADMIN_NAV_GROUPS.map((group, index) => (
              <section key={group.title}>
                <p
                  className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 ${
                    index > 0 ? "pt-5" : ""
                  }`}
                >
                  {group.title}
                </p>
                <ul className="m-0 list-none space-y-1 p-0">
                  {group.items.map((item) => {
                    const isActive = item.to === crumb.activeNav;
                    return (
                      <li key={item.to}>
                        <Link
                          className={`nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${
                            isActive
                              ? "bg-primary-fixed/40 font-semibold text-brand-magenta"
                              : "font-medium text-on-surface-variant hover:bg-surface-container"
                          }`}
                          to={item.to}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <MaterialIcon
                            name={item.icon}
                            className="text-[20px]"
                          />
                          {item.label}
                          {item.badge ? (
                            <span className="ml-auto rounded-full bg-alert-amber/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
          <footer className="shrink-0 border-t border-border-subtle p-3">
            <section className="rounded-lg bg-surface-container-low px-3 py-2">
              <p className="m-0 text-[11px] text-on-surface-variant">
                SLA Delivery
              </p>
              <p className="m-0 text-[15px] font-extrabold text-tertiary">
                99.2%
              </p>
            </section>
            <p className="m-0 flex items-center gap-2.5 px-1 pt-3">
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[12px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                {initialOf(name, "D")}
              </span>
              <span className="block leading-tight">
                <span className="block text-[12px] font-semibold text-on-surface">
                  {name}
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  Jak-Sel
                </span>
              </span>
            </p>
          </footer>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-surface-canvas/90 px-4 backdrop-blur-md lg:px-8">
            <button
              className="grid size-9 place-items-center rounded-lg text-on-surface hover:bg-surface-container lg:hidden"
              id="sidebar-toggle"
              type="button"
              aria-controls="admin-sidebar"
              aria-expanded={open}
              aria-label="Buka menu navigasi"
              onClick={() => setOpen(true)}
            >
              <MaterialIcon name="menu" />
            </button>
            <nav
              className="hidden items-center gap-1 text-[12px] text-on-surface-variant sm:flex"
              aria-label="Breadcrumb"
            >
              {crumb.sectionHref ? (
                <Link className="hover:text-on-surface" to={crumb.sectionHref}>
                  {crumb.section}
                </Link>
              ) : (
                <span>{crumb.section}</span>
              )}
              <MaterialIcon name="chevron_right" className="text-[14px]" />
              <span className="font-semibold text-on-surface">
                {crumb.current}
              </span>
            </nav>
            <p className="m-0 ml-auto flex items-center gap-2">
              <Link
                className="hidden items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant hover:bg-surface-container sm:inline-flex"
                to="/"
              >
                <MaterialIcon name="swap_horiz" className="text-[16px]" /> Mode
                Kurir
              </Link>
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[12px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                {initialOf(name, "D")}
              </span>
            </p>
          </header>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
