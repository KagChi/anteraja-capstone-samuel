import type { SeoConfig } from "../types";

/**
 * Static page metadata. Structured data is intentionally not baked in:
 * JSON-LD must be derived from live values, never from sample rows.
 */
export const SEO: Record<string, SeoConfig> = {
  "/": {
    title: "Satria Rapid Field Dispatch — Purwarupa Anteraja Instant",
    description:
      "Purwarupa antarmuka Anteraja Instant: aplikasi kurir Satria (mobile) dan konsol Admin/Hub (desktop) untuk integritas pengiriman berbasis geolokasi.",
  },
  "/shipments": {
    title: "Lacak Resi Pengiriman — Anteraja Instant",
    description:
      "Daftar dan pelacakan resi Anteraja Instant: cari nomor resi untuk melihat status, kurir, alamat tujuan, dan riwayat perjalanan.",
  },
  "/404": {
    title: "Halaman tidak ditemukan — Anteraja Instant",
    description:
      "Halaman yang Anda tuju tidak tersedia. Kembali ke beranda atau lacak nomor resi Anteraja Instant dari halaman ini.",
  },
  "/courier/tugas": {
    title: "Daftar Tugas Pengiriman — Satria | Anteraja Instant",
    description:
      "Daftar tugas pengiriman kurir Satria: stop aktif, jarak, estimasi, badge Instant/Same-Day, dan penanda wajib PIN.",
  },
  "/courier/verifikasi": {
    title: "Verifikasi Lokasi & PIN — Satria | Anteraja Instant",
    description:
      "Verifikasi lokasi geofence dan PIN otorisasi penerima sebelum pengiriman Anteraja Instant diselesaikan.",
  },
  "/courier/bukti-foto": {
    title: "Ambil Bukti Foto (POD) — Satria | Anteraja Instant",
    description:
      "Kamera dalam aplikasi untuk Proof of Delivery ber-watermark koordinat, alamat, penerima, dan waktu server.",
  },
  "/courier/sukses": {
    title: "Konfirmasi Sukses — Satria | Anteraja Instant",
    description:
      "Konfirmasi pengiriman tuntas dengan ringkasan integritas audit: geofence, PIN, stempel waktu NTP, dan kode hash audit.",
  },
  "/admin/dashboard": {
    title: "Dashboard Pengiriman — Admin Hub | Anteraja Instant",
    description:
      "Konsol Admin/Hub: pantau status integritas pengiriman kurir Satria hari ini, filter perlu tinjauan, dan buka audit trail.",
  },
  "/admin/audit-trail": {
    title: "Detail Audit Trail | Admin Hub Anteraja",
    description:
      "Jejak audit lengkap satu pengiriman Anteraja Instant: validasi geofence, POD ber-watermark, riwayat PIN, kronologi event, dan putusan admin.",
  },
  "/admin/antrian-pengecualian": {
    title: "Antrian Pengecualian Geofence — Admin Hub | Anteraja Instant",
    description:
      "Antrian persetujuan dispensasi lokasi kurir di luar radius geofence resmi, dengan deviasi, alasan, dan aksi tinjau.",
  },
  "/admin/pengaturan-radius": {
    title: "Pengaturan Radius Layanan — Admin Hub | Anteraja Instant",
    description:
      "Kebijakan geofence sistem: atur batas toleransi jarak GPS kurir per segmen layanan Instant, Same-Day, Reguler, dan Kargo.",
  },
};
