export interface AdminNavItem {
  label: string;
  icon: string;
  to: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "Operasional Harian",
    items: [
      { label: "Daftar Pengiriman", icon: "list_alt", to: "/admin/dashboard" },
      {
        label: "Antrian Pengecualian",
        icon: "approval",
        to: "/admin/antrian-pengecualian",
      },
      {
        label: "PIN Terkunci",
        icon: "lock_reset",
        to: "/admin/pin-terkunci",
      },
    ],
  },
  {
    title: "Konfigurasi Sistem",
    items: [
      {
        label: "Pengaturan Radius",
        icon: "radar",
        to: "/admin/pengaturan-radius",
      },
    ],
  },
];

export interface CourierNavItem {
  label: string;
  icon: string;
  to: string;
  filled?: boolean;
}

export const COURIER_NAV_ITEMS: CourierNavItem[] = [
  { label: "Tugas", icon: "local_shipping", to: "/courier/tugas" },
  { label: "Verifikasi", icon: "verified", to: "/courier/verifikasi" },
  { label: "Riwayat", icon: "history", to: "/courier/riwayat" },
  { label: "Profil", icon: "person", to: "/courier/profil" },
];
