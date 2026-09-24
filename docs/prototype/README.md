# Anteraja Instant — Purwarupa Antarmuka (branch `7-prototype`)

Kerangka web statis hasil konversi rancangan UI/UX (`docs/ui/`) menjadi halaman
fungsional yang saling terhubung. Setiap layar mengacu pada **PRD**
(`docs/PRD-anteraja-instant.md`) dan lima **FRD** di `docs/frd/`. Purwarupa ini
menjadi fondasi visual untuk latihan berikutnya: menambahkan interaksi dengan
JavaScript di `src/assets/js/app.js` memakai selector yang sudah disiapkan
(lihat §10).

| | |
|---|---|
| **Produk** | Anteraja — Satria Rapid Field Dispatch |
| **Branch** | `7-prototype` |
| **Stack** | HTML statis + Tailwind Play CDN; design token di `src/assets/js/tailwind.config.js` (dari `docs/ui/DESIGN.md`) |
| **Tipografi** | Plus Jakarta Sans + Material Symbols (Google Fonts) |
| **Referensi** | `docs/PRD-anteraja-instant.md`, `docs/frd/FRD-01..05`, `docs/ui/` |

---

## 1. Struktur Berkas

```
src/
  index.html                    # Landing: pemilih alur Kurir / Admin
  courier/                      # Aplikasi kurir (mobile)
    tugas.html                  # Daftar tugas pengiriman
    verifikasi.html             # Verifikasi lokasi & PIN
    bukti-foto.html             # Ambil bukti foto (POD)
    sukses.html                 # Konfirmasi sukses
  admin/                        # Konsol Admin/Hub (desktop)
    dashboard.html              # Dashboard pengiriman
    audit-trail.html            # Detail audit trail
    antrian-pengecualian.html   # Antrian pengecualian
    pengecualian-detail.html    # Modal detail pengecualian
    pengaturan-radius.html      # Pengaturan radius layanan
  assets/
    js/tailwind.config.js       # Design token (DESIGN.md)
    js/app.js                   # Interaksi per halaman (objek PAGES, lihat §10)
    css/app.css                 # Reset, safe-area, ikon
    img/logo-anteraja.png       # Logo resmi Anteraja (anteraja.id)
    img/favicon.svg             # Ikon web (mark magenta)
```

## 2. Pemetaan Halaman → PRD/FRD

| # | Halaman | Berkas | FRD yang dijawab |
|---|---|---|---|
| — | Landing pemilih alur | `src/index.html` | PRD §11 (UI) |
| K1 | Daftar Tugas Pengiriman | `courier/tugas.html` | FRD-03, FRD-04 |
| K2 | Verifikasi Lokasi & PIN | `courier/verifikasi.html` | FRD-01, FRD-03, FRD-04 |
| K3 | Ambil Bukti Foto (POD) | `courier/bukti-foto.html` | FRD-02 |
| K4 | Konfirmasi Sukses | `courier/sukses.html` | FRD-01, FRD-02, FRD-03, FRD-05 |
| A1 | Dashboard Pengiriman | `admin/dashboard.html` | FRD-01, FRD-04 |
| A2 | Detail Audit Trail | `admin/audit-trail.html` | FRD-05 |
| A3 | Antrian Pengecualian | `admin/antrian-pengecualian.html` | FRD-01 |
| A3b | Modal Detail Pengecualian | `admin/pengecualian-detail.html` | FRD-01, FRD-05 |
| A4 | Pengaturan Radius | `admin/pengaturan-radius.html` | FRD-01 |

### Keterkaitan antar halaman
- **Landing** → `courier/tugas.html` dan `admin/dashboard.html`.
- **Alur kurir:** `tugas → verifikasi → bukti-foto → sukses → tugas` (tab bar bawah & CTA).
- **Alur admin:** sidebar tetap ke Dashboard / Antrian Pengecualian / Pengaturan Radius;
  Dashboard → Audit Trail lewat nomor resi & aksi "Tinjau"; Antrian → Detail Pengecualian;
  Audit Trail → kembali ke Dashboard. Tiap konsol punya tombol **Mode Kurir** ke landing.

## 3. JSON-LD (schema.org)

Setiap halaman menyematkan satu blok `application/ld+json` yang mengacu dokumentasi
[schema.org](https://schema.org):

| Halaman | Tipe schema.org |
|---|---|
| `index.html` | `Organization`, `WebSite`, `ItemList` |
| `courier/tugas.html` | `ItemList` → `ParcelDelivery` |
| `courier/verifikasi.html` | `ParcelDelivery`, `Place` (`GeoCoordinates`), `DeliveryEvent` |
| `courier/bukti-foto.html` | `ImageObject` (+ `GeoCoordinates`, `ParcelDelivery`) |
| `courier/sukses.html` | `ParcelDelivery`, `DeliveryEvent` |
| `admin/dashboard.html` | `ItemList` → `ParcelDelivery` |
| `admin/audit-trail.html` | `ParcelDelivery`, `DeliveryEvent`, `BreadcrumbList` |
| `admin/antrian-pengecualian.html` | `ItemList` → `ParcelDelivery` |
| `admin/pengecualian-detail.html` | `ParcelDelivery`, `DeliveryEvent` (`PotentialActionStatus`) |
| `admin/pengaturan-radius.html` | `ItemList` → `Service` (`PropertyValue`) |

## 4. Semantic HTML

Struktur memakai elemen semantik alih-alih `<div>`: `header`, `nav`, `main`,
`section`, `article`, `aside`, `figure`/`figcaption`, `details`/`summary`,
`fieldset`/`legend`, `table`/`thead`/`tbody`/`th[scope]`, `dl`/`dt`/`dd`,
`ol`/`ul`/`li`, `time`, `mark`, `address`, `search`, `output`, `dialog`.
Heading testable berjenjang (`h1` → `h2` → `h3`), skip-link, dan ARIA
(`role="tablist"`, `aria-current`, `aria-modal`, `aria-live`).

Jumlah `<div>` per halaman setelah penyaringan semantik: **0–3** (hanya untuk
pembungkus tata letak yang tidak punya padanan semantik, mis. kolom flex sidebar).

## 5. Selector Antarmuka

Setiap elemen interaktif punya `id`/`class` stabil yang mengendalikan perilaku
JavaScript di §10:

| Elemen | Selector |
|---|---|
| Filter segmen (kurir) | `#segment-bar`, `.seg-btn[data-filter]`, `#task-container`, `.task-card[data-category]` |
| Input PIN | `#pin-form`, `#pin-group`, `.pin-digit`, `#btn-submit-pin`, `#btn-resend-pin` |
| Hubungan penerima | `#relation-tabs`, `.relation-tab[data-relation]` |
| CTA verifikasi | `#btn-next-step`, `#geofence-status`, `#lock-reason` |
| POD | `#pod-viewfinder`, `#pod-watermark`, `#btn-confirm-pod`, `#btn-retake-photo` |
| Detail integritas | `#audit-details` |
| Filter dashboard | `#filter-tabs`, `.filter-tab[data-status]`, `#search-input`, `#filter-service`, `#filter-region`, `#delivery-table-body`, `.delivery-row[data-flag][data-service]` |
| Audit trail | `#audit-form`, `#audit-decision-approve`, `#audit-decision-reject`, `#audit-notes`, `#btn-save-case`, `#save-status`, `#btn-export-audit` |
| Antrian pengecualian | `#exception-tabs`, `.filter-tab[data-service]`, `#exception-search`, `#exception-table-body`, `.exception-row[data-service]`, `#decision-toast` |
| Detail pengecualian | `#modal-exception`, `#btn-approve-exception`, `#btn-reject-exception`, `#exception-note` |
| Radius | `.stepper-btn[data-stepper][data-delta]`, `#radius-instant`, `#radius-sameday`, `#radius-reguler`, `#radius-kargo`, `#btn-save-radius`, `#btn-reset-radius` |

## 6. Responsivitas

- Mobile-first; halaman kurir dirender pada kolom sempit (`max-w-md`, ±448 px).
- Konsol admin: sidebar tetap ≥ `lg`, dan berubah menjadi drawer dengan
  `#sidebar-toggle` + `#sidebar-backdrop` di bawah `lg`.
- Diuji pada viewport 375 px (kurir), 768 px, dan 1280 px (admin).

## 7. Cara Menjalankan

Purwarupa statis; cukup buka `src/index.html` di peramban, atau jalankan server:

```sh
python3 -m http.server 8080 --directory src
# lalu buka http://localhost:8080/
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

Setiap interaksi user experience diimplementasikan pada commit terpisah agar
jejak DOM manipulation dan event handler mudah ditelusuri:

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

## 10. Interaksi JavaScript

Seluruh perilaku interaktif berada di `src/assets/js/app.js` (vanilla JS, tanpa
dependensi). Berkas ini memakai objek `PAGES` yang memetakan nilai
`<body data-page="...">` ke fungsi `init` per halaman. Helper bersama: `$`/`$$`
(selector), `storage` (`localStorage`), `withLoading()` (animasi loader + tombol
nonaktif), `showToast()`, `activateTab()`, `greet()`, dan `clamp()`. Gaya toast
disuntikkan oleh `ensureToast()` lewat `<style id="app-toast-style">` sehingga
tidak bergantung pada urutan/cache `app.css`; aset bersama juga diberi query
`?v=8` di semua halaman.

Konsep yang diterapkan: variabel (`var`/objek), function (deklarasi + callback),
operator (`===`, `&&`, `||`, `?:`, aritmetika), dan selection condition
(`if`/`else`, guard clause, `switch` lewat objek `PAGES`).

| Halaman | Interaksi |
|---|---|
| `index.html` | Klik **Masuk sebagai ...** membuka `<dialog>` login; submit menyimpan `anteraja.session` lalu loader, lantas redirect sesuai peran |
| `courier/tugas` | Filter segmen memfilter `.task-card[data-category]` dan memperbarui jumlah tersisa; Pindai Resi Manual mencari serta menyorot kartu; sapaan nama kurir |
| `courier/verifikasi` | PIN 6 digit auto-advance/backspace/paste; PIN demo `123456`; PIN salah menambah `#pin-attempts` (maks 3 lalu terkunci); `#btn-resend-pin` countdown 30 detik; pilihan hubungan penerima; loader ke `bukti-foto.html` |
| `courier/bukti-foto` | Watermark jam berjalan; klik viewfinder atau ambil ulang memicu kilatan shutter; loader ke `sukses.html` |
| `courier/sukses` | Kode hash audit dibuat acak, stempel waktu diperbarui, jumlah tugas selesai dihitung dari `localStorage` |
| `admin/dashboard` | Filter status, pencarian, layanan, dan wilayah digabung (AND); jumlah baris serta empty-state dinamis; sapaan admin |
| `admin/audit-trail` | Catatan wajib saat Tolak/Investigasi; tombol simpan menampilkan loader lalu status tersimpan; Ekspor Audit memicu dialog cetak PDF |
| `admin/antrian-pengecualian` | Filter layanan dan pencarian; keputusan dari halaman detail menghapus baris serta menampilkan `#decision-toast` |
| `admin/pengecualian-detail` | Tombol Setujui/Tolak menampilkan loader, menyimpan keputusan beserta catatan, lalu kembali ke antrian |
| `admin/pengaturan-radius` | Stepper plus/minus dengan batas min-maks per segmen; tombol simpan aktif hanya saat ada perubahan; terapkan dan batalkan |

### Data contoh dan penyimpanan

`localStorage` dipakai untuk mensimulasikan sesi/status tanpa backend:

| Kunci | Isi |
|---|---|
| `anteraja.session` | `{ role, name, at }` dari form login |
| `anteraja.decisions` | Keputusan pengecualian per nomor resi |
| `anteraja.radii` | Radius geofence per segmen hasil Terapkan |
| `anteraja.completed` | Daftar resi yang sudah dituntaskan |

PIN demo di halaman verifikasi adalah **123456** (tertera di `#pin-hint` dan
diulang saat menekan "Kirim ulang PIN"). Bersihkan `localStorage` untuk mengulang
alur dari awal.

### Uji cepat

```sh
python3 -m http.server 8080 --directory src
# buka http://localhost:8080/ lalu pilih peran dan masuk
```
