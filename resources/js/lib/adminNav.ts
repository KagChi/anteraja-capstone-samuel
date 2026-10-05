import { ADMIN_NAV_GROUPS } from "../data/nav";

export interface AdminCrumb {
  section: string;
  sectionHref?: string;
  current: string;
  activeNav: string;
}

/**
 * Explicit crumbs for routes that either have no nav item (for example the
 * audit-trail detail view) or whose label differs from the nav entry.
 */
export const ADMIN_CRUMBS: Record<string, AdminCrumb> = {
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
  "/admin/pin-terkunci": {
    section: "Operasional Harian",
    sectionHref: "/admin/dashboard",
    current: "PIN Terkunci",
    activeNav: "/admin/pin-terkunci",
  },
  "/admin/pengaturan-radius": {
    section: "Konfigurasi Sistem",
    current: "Pengaturan Radius",
    activeNav: "/admin/pengaturan-radius",
  },
};

const DEFAULT_CRUMB = ADMIN_CRUMBS["/admin/dashboard"];

/**
 * Resolve the breadcrumb and active nav item for a pathname. Explicit crumbs
 * win; otherwise the nav item whose route is the longest prefix of the path
 * is used, so nested detail routes keep their parent section highlighted.
 */
export function resolveAdminCrumb(pathname: string): AdminCrumb {
  const explicit = ADMIN_CRUMBS[pathname];
  if (explicit) return explicit;

  let match:
    | { to: string; label: string; groupTitle: string; isFirstInGroup: boolean }
    | undefined;

  for (const group of ADMIN_NAV_GROUPS) {
    group.items.forEach((item, index) => {
      const matchesItem =
        pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (!matchesItem) return;
      if (match && match.to.length >= item.to.length) return;
      match = {
        to: item.to,
        label: item.label,
        groupTitle: group.title,
        isFirstInGroup: index === 0,
      };
    });
  }

  if (!match) return DEFAULT_CRUMB;

  return {
    section: match.groupTitle,
    sectionHref: match.isFirstInGroup ? undefined : "/admin/dashboard",
    current: match.label,
    activeNav: match.to,
  };
}
