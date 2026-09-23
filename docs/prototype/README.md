# Anteraja Instant — Purwarupa Antarmuka (branch `7-prototype`)

Kerangka web statis hasil konversi rancangan UI/UX (`docs/ui/`) menjadi halaman
fungsional yang saling terhubung. Setiap layar mengacu pada **PRD**
(`docs/PRD-anteraja-instant.md`) dan lima **FRD** di `docs/frd/`. Purwarupa ini
menjadi fondasi visual untuk latihan berikutnya: menambahkan interaksi dengan
JavaScript/jQuery memakai selector yang sudah disiapkan.

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
    js/app.js                   # Perilaku dasar (sidebar, stub link)
    css/app.css                 # Reset, safe-area, ikon
    img/logo-anteraja.png       # Logo resmi Anteraja (anteraja.id)
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

## 5. Selector untuk Latihan JS/jQuery

Setiap elemen interaktif punya `id`/`class` stabil:

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

## 9. Dokumentasi PDF

```sh
cd docs/prototype
typst compile --font-path ../ui/fonts prototype-documentation.typ prototype-documentation.pdf
```

- [`prototype-documentation.typ`](./prototype-documentation.typ) — sumber (A4).
- [`prototype-documentation.pdf`](./prototype-documentation.pdf) — hasil ekspor LMS.
- [`proof-branch.png`](./proof-branch.png) — bukti branch.
- `shots/` — tangkapan layar hasil build.
