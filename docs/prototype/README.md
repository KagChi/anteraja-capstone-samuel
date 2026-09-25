# Anteraja Instant — Purwarupa Antarmuka (branch `7-prototype`)

Purwarupa interaktif hasil konversi rancangan UI/UX (`docs/ui/`) menjadi
aplikasi **React + Vite + TypeScript** dengan **Tailwind CSS v4**. Versi statis
awal (HTML + Tailwind Play CDN) telah dipindahkan ke dalam komponen dan rute di
`src/`, sambil mempertahankan JSON-LD, markup semantik, dan kontrak aksesibilitas.
Setiap layar mengacu pada **PRD** (`docs/PRD-anteraja-instant.md`) dan lima
**FRD** di `docs/frd/`.

| | |
|---|---|
| **Produk** | Anteraja — Satria Rapid Field Dispatch |
| **Branch** | `7-prototype` |
| **Stack** | React 19 + Vite + TypeScript (strict); Tailwind CSS v4; react-router-dom; Biome untuk lint/format; Bun sebagai package manager |
| **Tipografi** | Plus Jakarta Sans + Material Symbols (Google Fonts di `index.html`) |
| **Referensi** | `docs/PRD-anteraja-instant.md`, `docs/frd/FRD-01..05`, `docs/ui/` |

---

## 1. Struktur Berkas

```
index.html                    # Shell Vite: meta dasar + Google Fonts
public/
  logo-anteraja.png           # Logo resmi Anteraja (anteraja.id)
  favicon.svg                 # Ikon web (mark magenta)
src/
  main.tsx                    # Bootstrap React
  App.tsx                     # Provider (Session, Toast) + definisi rute
  index.css                   # Tailwind v4 @theme (design token) + @layer base
  types.ts                    # Tipe domain (Task, Shipment, Radius, dll.)
  lib/
    format.ts                 # Helper format (Rupiah, waktu, hash audit)
    storage.ts                # Pembungkus localStorage + kunci
  data/
    tasks.ts                  # Data tugas kurir
    shipments.ts              # Data pengiriman admin
    nav.ts                    # Item navigasi courier/admin
    seo.ts                    # Judul, meta, dan JSON-LD per rute
  hooks/
    useSeo.ts                 # Menyuntik title/meta/JSON-LD
    useWelcomeToast.ts        # Sapaan pengguna dari sesi
    useDebouncedValue.ts      # Debounce input pencarian
  context/
    SessionContext.tsx        # Sesi pengguna (localStorage)
    ToastContext.tsx          # Toast global (aria-live)
  components/
    MaterialIcon.tsx          # Ikon Material Symbols
    LoadingAction.tsx         # LoadingButton / LoadingLink / Spinner
    Badges.tsx                # ServiceTag / StatusPill
    ScrollToTop.tsx           # Reset scroll saat rute berubah
    courier/CourierBottomNav.tsx
    admin/AdminLayout.tsx     # Sidebar + header + drawer (desktop console)
  pages/
    LandingPage.tsx           # Pemilih alur + dialog login
    courier/
      TugasPage.tsx           # Daftar tugas pengiriman
      VerifikasiPage.tsx      # Verifikasi lokasi & PIN
      BuktiFotoPage.tsx       # Ambil bukti foto (POD)
      SuksesPage.tsx          # Konfirmasi sukses
    admin/
      DashboardPage.tsx       # Dashboard pengiriman
      AuditTrailPage.tsx      # Detail audit trail
      AntrianPengecualianPage.tsx
      PengecualianDetailPage.tsx
      PengaturanRadiusPage.tsx
```

## 2. Pemetaan Halaman → PRD/FRD

| # | Halaman | Rute | FRD yang dijawab |
|---|---|---|---|
| — | Landing pemilih alur | `/` | PRD §11 (UI) |
| K1 | Daftar Tugas Pengiriman | `/courier/tugas` | FRD-03, FRD-04 |
| K2 | Verifikasi Lokasi & PIN | `/courier/verifikasi` | FRD-01, FRD-03, FRD-04 |
| K3 | Ambil Bukti Foto (POD) | `/courier/bukti-foto` | FRD-02 |
| K4 | Konfirmasi Sukses | `/courier/sukses` | FRD-01, FRD-02, FRD-03, FRD-05 |
| A1 | Dashboard Pengiriman | `/admin/dashboard` | FRD-01, FRD-04 |
| A2 | Detail Audit Trail | `/admin/audit-trail` | FRD-05 |
| A3 | Antrian Pengecualian | `/admin/antrian-pengecualian` | FRD-01 |
| A3b | Detail Pengecualian | `/admin/pengecualian-detail` | FRD-01, FRD-05 |
| A4 | Pengaturan Radius | `/admin/pengaturan-radius` | FRD-01 |

Rute admin bersarang di bawah `AdminLayout` (sidebar tetap); rute kurir memakai
`CourierBottomNav`. Rute tak dikenal dialihkan ke `/`.

### Keterkaitan antar halaman
- **Landing** → `/courier/tugas` dan `/admin/dashboard`.
- **Alur kurir:** `tugas → verifikasi → bukti-foto → sukses → tugas` (tab bar bawah & CTA).
- **Alur admin:** sidebar tetap ke Dashboard / Antrian Pengecualian / Pengaturan Radius;
  Dashboard → Audit Trail lewat nomor resi & aksi "Tinjau"; Antrian → Detail Pengecualian;
  Audit Trail → kembali ke Dashboard. Tiap konsol punya tombol **Mode Kurir** ke landing.

## 3. JSON-LD (schema.org)

Metadata dan JSON-LD didefinisikan per rute di `src/data/seo.ts` dan disuntikkan
oleh `useSeo`. Setiap halaman menyematkan satu blok `application/ld+json` yang
mengacu dokumentasi [schema.org](https://schema.org):

| Halaman | Tipe schema.org |
|---|---|
| Landing | `Organization`, `WebSite`, `ItemList` |
| Tugas | `ItemList` → `ParcelDelivery` |
| Verifikasi | `ParcelDelivery`, `Place` (`GeoCoordinates`), `DeliveryEvent` |
| Bukti foto | `ImageObject` (+ `GeoCoordinates`, `ParcelDelivery`) |
| Sukses | `ParcelDelivery`, `DeliveryEvent` |
| Dashboard | `ItemList` → `ParcelDelivery` |
| Audit trail | `ParcelDelivery`, `DeliveryEvent`, `BreadcrumbList` |
| Antrian pengecualian | `ItemList` → `ParcelDelivery` |
| Detail pengecualian | `ParcelDelivery`, `DeliveryEvent` (`PotentialActionStatus`) |
| Pengaturan radius | `ItemList` → `Service` (`PropertyValue`) |

## 4. Semantic HTML

Struktur memakai elemen semantik alih-alih `<div>`: `header`, `nav`, `main`,
`section`, `article`, `aside`, `figure`/`figcaption`, `details`/`summary`,
`fieldset`/`legend`, `table`/`thead`/`tbody`/`th[scope]`, `dl`/`dt`/`dd`,
`ol`/`ul`/`li`, `time`, `mark`, `address`, `search`, `output`, `dialog`.
Heading testable berjenjang (`h1` → `h2` → `h3`), skip-link, dan ARIA
(`role="tablist"`, `aria-current`, `aria-modal`, `aria-live`). Aturan aksesibilitas
Biome (`a11y`) dijaga hijau di seluruh komponen.

## 5. Rute dan Komponen Interaktif

Logika per layar berada di komponen rutenya masing-masing; bukan lagi selector
DOM stabil. Titik interaksi utama:

| Layar | Komponen | Interaksi |
|---|---|---|
| Landing | `LandingPage` | Dialog login (nama + peran), loader, simpan sesi, redirect |
| Tugas | `TugasPage` | Filter segmen, pindai resi manual (debounced), sapaan kurir |
| Verifikasi | `VerifikasiPage` | PIN 6 digit auto-lanjut, batas percobaan, resend countdown, pilihan hubungan penerima |
| Bukti foto | `BuktiFotoPage` | Watermark jam, kilatan shutter, hash audit |
| Sukses | `SuksesPage` | Kode hash acak, stempel waktu, hitung tugas selesai |
| Dashboard | `DashboardPage` | Filter gabungan (status/pencarian/layanan/wilayah) + empty-state |
| Audit trail | `AuditTrailPage` | Validasi catatan keputusan, loader simpan, ekspor cetak |
| Antrian pengecualian | `AntrianPengecualianPage` | Filter layanan + pencarian; keputusan menghapus baris & memunculkan toast |
| Detail pengecualian | `PengecualianDetailPage` | Setujui/Tolak + catatan, loader, kembali ke antrian |
| Radius | `PengaturanRadiusPage` | Stepper min–maks per segmen, tombol Terapkan hanya saat kotor |

## 6. Responsivitas

- Mobile-first; halaman kurir dirender pada kolom sempit (`max-w-md`, ±448 px).
- Konsol admin: sidebar tetap ≥ `lg`, berubah menjadi drawer di bawah `lg`.
- Diuji pada viewport 375 px (kurir), 768 px, dan 1280 px (admin).

## 7. Cara Menjalankan

```sh
bun install
bun run dev        # server pengembangan
bun run build      # tsc -b + build produksi
bun run preview    # pratinjau hasil build
bun run lint       # Biome (lint + format)
```

## 8. Commit Modular

| Commit | Isi |
|---|---|
| `chore(prototype)` | Scaffold struktur, design token, aset bersama |
| `feat(courier)` | Daftar tugas (FRD-03/04) |
| `feat(courier)` | Verifikasi lokasi + PIN (FRD-01/03/04) |
| `feat(courier)` | Bukti foto + sukses (FRD-02/05) |
| `feat(admin)` | Dashboard pengiriman (FRD-01/04) |
| `feat(admin)` | Audit trail + JSON-LD (FRD-05) |
| `feat(admin)` | Antrian, detail pengecualian, radius (FRD-01/05) |
| `feat(prototype)` | Landing index |
| `refactor(prototype)` | Semantic HTML + JSON-LD di semua halaman |

### Commit interaksi UX (min. 5 interaksi berbeda)

| Hash | Commit | Interaksi |
|---|---|---|
| `4d5f411` | `feat(ux): add login dialog with loader and session greeting` | Dialog login + sesi + sapaan pengguna |
| `22ec73e` | `feat(courier): add task filter and manual resi scan UX` | Filter segmen & pindai resi |
| `a5b01f2` | `feat(courier): add PIN autofill, attempt limit and resend countdown UX` | PIN auto-lanjut, batas percobaan, resend |
| `4d7284e` | `feat(courier): add POD watermark, shutter feedback and audit hash UX` | Watermark jam, shutter, hash audit |
| `f6757a0` | `feat(admin): add dashboard combined filters and empty-state UX` | Filter gabungan & empty-state |
| `0dab9ad` | `feat(admin): add audit decision validation, loader and PDF export UX` | Validasi keputusan, loader, ekspor |
| `84185f5` | `feat(admin): add exception decision flow with toast and row removal UX` | Keputusan pengecualian & toast |
| `3c1d9e8` | `feat(admin): add radius stepper with dirty-state apply/reset UX` | Stepper radius, terapkan/batalkan |

## 9. Dokumentasi PDF

```sh
cd docs/prototype
typst compile --font-path ../ui/fonts prototype-documentation.typ prototype-documentation.pdf
```

- [`prototype-documentation.typ`](./prototype-documentation.typ) — sumber (A4).
- [`prototype-documentation.pdf`](./prototype-documentation.pdf) — hasil ekspor LMS.
- [`proof-branch.png`](./proof-branch.png) — bukti branch.
- `shots/` — tangkapan layar hasil build.

## 10. Interaksi dan Status

Seluruh perilaku interaktif kini dikelola oleh React: `useState`/`useEffect`,
`react-router` untuk navigasi, dan Context (`SessionContext`, `ToastContext`)
untuk state lintas layar. Helper bersama: `lib/format.ts`, `lib/storage.ts`,
`hooks/useSeo`, `hooks/useWelcomeToast`, `hooks/useDebouncedValue`. Komponen
`LoadingAction` menyediakan tombol/tautan dengan animasi loader dan status
nonaktif; `ToastContext` menampilkan notifikasi lewat `<output aria-live>`.

### Data contoh dan penyimpanan

`localStorage` dipakai untuk mensimulasikan sesi/status tanpa backend
(`src/lib/storage.ts`):

| Kunci | Isi |
|---|---|
| `anteraja.session` | `{ role, name, at }` dari form login |
| `anteraja.decisions` | Keputusan pengecualian per nomor resi |
| `anteraja.radii` | Radius geofence per segmen hasil Terapkan |
| `anteraja.completed` | Daftar resi yang sudah dituntaskan |
| `anteraja.relation` | Pilihan hubungan penerima pada verifikasi |

PIN demo di halaman verifikasi adalah **123456**. Bersihkan `localStorage` untuk
mengulang alur dari awal.

### Uji cepat

```sh
bun run dev
# buka http://localhost:5173/ lalu pilih peran dan masuk
```
