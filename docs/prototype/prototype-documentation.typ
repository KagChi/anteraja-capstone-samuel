// ============================================================
//  Anteraja Instant — Dokumentasi Purwarupa Antarmuka
//  Branch : 7-prototype
//  Compile: typst compile --font-path ../ui/fonts prototype-documentation.typ
// ============================================================

#let magenta = rgb("#E00065")
#let yellow  = rgb("#FFCF0E")
#let green   = rgb("#00834B")
#let ink     = rgb("#1C1B1B")
#let soft    = rgb("#FCF9F8")
#let hair    = rgb("#EAE7E7")
#let codebg  = rgb("#F5F1F1")

#let font-body = ("Plus Jakarta Sans", "Helvetica Neue", "Arial")
#let font-mono = ("Menlo", "DejaVu Sans Mono", "Courier New")

#set page(
  paper: "a4",
  margin: (x: 1.8cm, top: 1.6cm, bottom: 1.8cm),
  header: context {
    if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: luma(45%))
      grid(
        columns: (1fr, auto),
        align: (left, right),
        [Anteraja Instant — Dokumentasi Purwarupa Antarmuka],
        [branch #text(fill: magenta, weight: "bold")[7-prototype]],
      )
      v(-0.3em)
      line(length: 100%, stroke: 0.5pt + hair)
    }
  },
  footer: context [
    #set text(size: 8pt, fill: luma(45%))
    #line(length: 100%, stroke: 0.5pt + hair)
    #v(-0.2em)
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      [Capstone Anteraja Instant],
      [#text(fill: magenta, weight: "bold")[#counter(page).display()]],
    )
  ],
)

#set text(font: font-body, size: 10pt, fill: ink)
#set par(justify: true, leading: 0.72em)
#set heading(numbering: "1.")
#show heading.where(level: 1): it => [
  #v(0.7em)
  #text(font: font-body, size: 15pt, weight: "bold", fill: magenta)[#counter(heading).display("1.") #it.body]
  #v(-0.35em)
  #line(length: 100%, stroke: 1.2pt + magenta)
  #v(0.15em)
]
#show heading.where(level: 2): it => [
  #v(0.4em)
  #text(font: font-body, size: 11.5pt, weight: "bold", fill: ink)[#counter(heading).display("1.1") #it.body]
  #v(-0.1em)
]
#show raw.where(block: true): set block(fill: codebg, inset: 9pt, radius: 4pt, width: 100%)
#show raw: set text(font: font-mono, size: 8pt)

// ---------------------------- COVER ----------------------------
#align(center)[
  #v(1.4cm)
  #text(font: font-body, size: 9pt, weight: "bold", fill: magenta, tracking: 0.12em)[PENGUMPULAN TUGAS — PURWARUPA UI/UX]
  #v(0.5em)
  #text(font: font-body, size: 24pt, weight: "bold")[Satria Rapid Field Dispatch]
  #v(0.15em)
  #text(font: font-body, size: 13pt, fill: luma(40%))[Anteraja Instant Delivery Integrity]
  #v(0.9em)
  #line(length: 60%, stroke: 1pt + hair)
  #v(0.9em)
  #text(size: 11pt)[
    Purwarupa antarmuka berbasis *HTML semantik* dan *JSON-LD schema.org*, hasil
    konversi rancangan UI pada `docs/ui/` menjadi halaman web yang saling terhubung.
  ]
  #v(1.2cm)
]

#align(center)[
  #table(
    columns: (4.2cm, 1fr),
    inset: 7pt,
    stroke: 0.6pt + hair,
    align: (left, left),
    fill: (x, y) => if y == 0 { codebg } else { white },
    [*Atribut*], [*Nilai*],
    [Branch], [#text(weight: "bold", fill: magenta)[7-prototype]],
    [Repository], [github.com/KagChi/anteraja-capstone-samuel],
    [Link branch], [#link("https://github.com/KagChi/anteraja-capstone-samuel/tree/7-prototype")[tree/7-prototype]],
    [Jumlah halaman], [10 halaman (landing + 4 kurir + 5 admin)],
    [Stack], [HTML statis + Tailwind Play CDN + design token DESIGN.md],
    [Dokumen acuan], [PRD `docs/PRD-anteraja-instant.md`, FRD-01..05],
  )
]

#align(center)[#v(0.6em) #text(size: 8.5pt, fill: luma(45%))[Lihat `docs/prototype/README.md` untuk detail tiap halaman.]]

#pagebreak()

// ---------------------------- 1 ----------------------------
= Ringkasan

Purwarupa ini mengubah rancangan layar pada `docs/ui/` menjadi *kerangka web*
(HTML statis) yang dapat dibuka langsung di peramban dan saling terhubung antar
halaman. Fokusnya adalah fondasi visual dan struktur: *semantic HTML*,
responsivitas, serta data terstruktur JSON-LD. Interaksi penuh
(JavaScript/jQuery) dikerjakan pada latihan berikutnya memakai selector
`id`/`class` yang sudah disiapkan tiap elemen.

Keputusan teknis:

- *HTML statis* tanpa proses build, memakai *Tailwind Play CDN* dan design token
  (warna, tipografi, spacing) yang diturunkan dari `docs/ui/DESIGN.md`.
- *Semantic HTML*: `header`, `nav`, `main`, `section`, `article`, `aside`,
  `figure`, `details`, `fieldset`, `table`, `dl`, `ol/ul`, `time`, `mark`,
  `address`, `search`, `output`, `dialog`.
- *JSON-LD schema.org* disematkan di *seluruh* halaman.
- Logo resmi Anteraja (anteraja.id) untuk brand; ikon web memakai mark tersendiri.

#figure(
  image("shots/index.png", width: 100%),
  caption: [Halaman landing yang menghubungkan alur Kurir dan Admin/Hub.],
)

// ---------------------------- 2 ----------------------------
= Pemetaan Halaman ke FRD

#table(
  columns: (1.1cm, 4.6cm, 5.2cm, 4.6cm),
  inset: 6pt,
  stroke: 0.5pt + hair,
  align: (left, left, left, left),
  fill: (x, y) => if y == 0 { codebg } else { white },
  [*No.*], [*Halaman*], [*Berkas*], [*FRD*],
  [—],  [Landing pemilih alur], [`src/index.html`], [PRD §11],
  [K1], [Daftar Tugas Pengiriman], [`courier/tugas.html`], [FRD-03, FRD-04],
  [K2], [Verifikasi Lokasi & PIN], [`courier/verifikasi.html`], [FRD-01, FRD-03, FRD-04],
  [K3], [Ambil Bukti Foto (POD)], [`courier/bukti-foto.html`], [FRD-02],
  [K4], [Konfirmasi Sukses], [`courier/sukses.html`], [FRD-01, FRD-02, FRD-03, FRD-05],
  [A1], [Dashboard Pengiriman], [`admin/dashboard.html`], [FRD-01, FRD-04],
  [A2], [Detail Audit Trail], [`admin/audit-trail.html`], [FRD-05],
  [A3], [Antrian Pengecualian], [`admin/antrian-pengecualian.html`], [FRD-01],
  [A3b], [Modal Detail Pengecualian], [`admin/pengecualian-detail.html`], [FRD-01, FRD-05],
  [A4], [Pengaturan Radius], [`admin/pengaturan-radius.html`], [FRD-01],
)

*Keterkaitan antar halaman.* Landing menuju kedua alur. Alur kurir berurutan
`tugas → verifikasi → bukti-foto → sukses → tugas`. Konsol admin memakai sidebar
tetap; Dashboard menuju Audit Trail lewat nomor resi, Antrian menuju Detail
Pengecualian, dan setiap konsol menyediakan tombol *Mode Kurir*.

#pagebreak()

// ---------------------------- 3 ----------------------------
= JSON-LD (schema.org)

Setiap halaman memuat satu blok `application/ld+json` yang mengacu pada
dokumentasi schema.org.

#table(
  columns: (5.4cm, 1fr),
  inset: 6pt,
  stroke: 0.5pt + hair,
  align: (left, left),
  fill: (x, y) => if y == 0 { codebg } else { white },
  [*Halaman*], [*Tipe schema.org*],
  [`index.html`], [`Organization`, `WebSite`, `ItemList`],
  [`courier/tugas.html`], [`ItemList` → `ParcelDelivery`],
  [`courier/verifikasi.html`], [`ParcelDelivery`, `Place` + `GeoCoordinates`, `DeliveryEvent`],
  [`courier/bukti-foto.html`], [`ImageObject` (+ `GeoCoordinates`, `ParcelDelivery`)],
  [`courier/sukses.html`], [`ParcelDelivery`, `DeliveryEvent`],
  [`admin/dashboard.html`], [`ItemList` → `ParcelDelivery`],
  [`admin/audit-trail.html`], [`ParcelDelivery`, `DeliveryEvent`, `BreadcrumbList`],
  [`admin/antrian-pengecualian.html`], [`ItemList` → `ParcelDelivery`],
  [`admin/pengecualian-detail.html`], [`ParcelDelivery`, `DeliveryEvent`],
  [`admin/pengaturan-radius.html`], [`ItemList` → `Service` + `PropertyValue`],
)

Contoh blok pada halaman Detail Audit Trail:

```json
{
  "@context": "https://schema.org",
  "@type": "ParcelDelivery",
  "trackingNumber": "ANT-INST-8829104",
  "deliveryStatus": "Completed",
  "provider": { "@type": "Organization", "name": "Anteraja" },
  "deliveryAddress": {
    "@type": "PostalAddress",
    "streetAddress": "Jl. Senopati No. 42",
    "addressLocality": "Kebayoran Baru",
    "addressCountry": "ID"
  },
  "deliveryTime": "2024-09-22T15:14:28+07:00"
}
```

// ---------------------------- 4 ----------------------------
= Semantic HTML

Setelah penyaringan semantik, jumlah elemen `<div>` per halaman tinggal *0–3*
(hanya untuk pembungkus tata letak yang tidak berpadanan semantik, mis. kolom flex
sidebar). Elemen yang dipakai antara lain `header`, `nav`, `main`, `section`,
`article`, `aside`, `figure`/`figcaption`, `details`/`summary`,
`fieldset`/`legend`, `table`/`thead`/`tbody`/`th[scope]`, `dl`/`dt`/`dd`,
`ol`/`ul`/`li`, `time`, `mark`, `address`, `search`, `output`, dan `dialog`.

#table(
  columns: (5.4cm, 1.6cm, 1fr),
  inset: 6pt,
  stroke: 0.5pt + hair,
  align: (left, center, left),
  fill: (x, y) => if y == 0 { codebg } else { white },
  [*Halaman*], [*`<div>`*], [*Catatan*],
  [`index.html`], [0], [Struktur penuh semantik],
  [`courier/tugas.html`], [0], [Kartu pakai `article` + `header`/`footer`],
  [`courier/verifikasi.html`], [1], [Pembungkus baris judul],
  [`courier/bukti-foto.html`], [1], [Pembungkus baris judul],
  [`courier/sukses.html`], [0], [—],
  [`admin/dashboard.html`], [2], [Kolom flex + baris sel],
  [`admin/audit-trail.html`], [3], [Pembungkus judul & kolom flex],
  [`admin/antrian-pengecualian.html`], [2], [Kolom flex + baris sel],
  [`admin/pengecualian-detail.html`], [1], [Kolom flex],
  [`admin/pengaturan-radius.html`], [2], [Kolom flex + baris sel],
)

Aksesibilitas: skip-link, hierarki heading `h1 → h2 → h3`, `role="tablist"` +
`aria-selected`, `aria-current="page"`, `aria-modal`, `aria-live`, `th[scope]`,
dan label eksplisit pada input.

#pagebreak()

// ---------------------------- 5 ----------------------------
= Tangkapan Layar

#figure(
  image("shots/admin-02-audit-trail.png", width: 100%),
  caption: [FRD-05 — Detail Audit Trail `ANT-INST-8829104` (desktop), halaman dengan JSON-LD `ParcelDelivery`.],
)

#figure(
  image("shots/courier-01-tugas.png", width: 44%),
  caption: [FRD-03/04 — Daftar Tugas Pengiriman (mobile), termasuk badge *Perlu PIN* dan jarak kurir ↔ tujuan.],
)

#pagebreak()

#figure(
  image("shots/courier-02-verifikasi.png", width: 44%),
  caption: [FRD-01/03 — Verifikasi Lokasi & PIN (mobile): status geofence dan input PIN 6 digit.],
)

#figure(
  image("shots/admin-03-antrian-pengecualian.png", width: 100%),
  caption: [FRD-01 — Antrian Pengecualian Geofence (desktop).],
)

#pagebreak()

#figure(
  image("shots/admin-05-pengaturan-radius.png", width: 100%),
  caption: [FRD-01 — Pengaturan Radius Layanan per segmen (desktop).],
)

// ---------------------------- 6 ----------------------------
= Selector untuk Latihan Berikutnya

Setiap elemen interaktif memiliki `id`/`class` stabil agar mudah dikendalikan
JavaScript/jQuery.

#table(
  columns: (4.4cm, 1fr),
  inset: 6pt,
  stroke: 0.5pt + hair,
  align: (left, left),
  fill: (x, y) => if y == 0 { codebg } else { white },
  [*Bagian*], [*Selector*],
  [Filter segmen kurir], [`#segment-bar`, `.seg-btn[data-filter]`, `#task-container`, `.task-card[data-category]`],
  [Input PIN], [`#pin-form`, `#pin-group`, `.pin-digit`, `#btn-resend-pin`],
  [Hubungan penerima], [`#relation-tabs`, `.relation-tab[data-relation]`],
  [CTA & status], [`#btn-next-step`, `#geofence-status`, `#lock-reason`],
  [POD], [`#pod-viewfinder`, `#pod-watermark`, `#btn-confirm-pod`, `#btn-retake-photo`],
  [Filter dashboard], [`#filter-tabs`, `.filter-tab[data-status]`, `#search-input`, `#delivery-table-body`, `.delivery-row[data-flag]`],
  [Audit trail], [`#audit-form`, `#audit-decision-approve`, `#audit-notes`, `#btn-save-case`, `#btn-export-audit`],
  [Antrian pengecualian], [`#exception-tabs`, `.filter-tab[data-service]`, `#exception-search`, `.exception-row[data-service]`, `#decision-toast`],
  [Detail pengecualian], [`#modal-exception`, `#btn-approve-exception`, `#btn-reject-exception`, `#exception-note`],
  [Radius], [`.stepper-btn[data-stepper][data-delta]`, `#radius-instant`, `#radius-sameday`, `#radius-reguler`, `#radius-kargo`, `#btn-save-radius`],
)

// ---------------------------- 7 ----------------------------
= Commit Modular

#table(
  columns: (1.9cm, 1fr),
  inset: 6pt,
  stroke: 0.5pt + hair,
  align: (left, left),
  fill: (x, y) => if y == 0 { codebg } else { white },
  [*Hash*], [*Pesan*],
  [`5452142`], [`chore(prototype): scaffold src layout, design tokens & shared assets`],
  [`ed976c7`], [`feat(courier): add task list screen (FRD-03/04)`],
  [`4d674fd`], [`feat(courier): add location + PIN verification screen (FRD-01/03/04)`],
  [`1f4690e`], [`feat(courier): add POD photo & success screens (FRD-02/05)`],
  [`b824939`], [`feat(admin): add dashboard shipment table (FRD-01/04)`],
  [`c74fdf3`], [`feat(admin): add audit trail detail with schema.org JSON-LD (FRD-05)`],
  [`2c0d4b9`], [`feat(admin): add exception queue, detail modal & radius settings (FRD-01/05)`],
  [`f2a3d66`], [`feat(prototype): add landing page linking courier & admin flows`],
  [`ba35fc7`], [`refactor(prototype): semantic HTML pass and schema.org JSON-LD on all pages`],
  [`d81fa00`], [`feat(assets): use official Anteraja logo (anteraja.id) across pages`],
  [`bec7137`], [`fix(assets): use dedicated favicon mark instead of wordmark for web icon`],
)

#v(0.4em)
#text(size: 9pt, fill: luma(40%))[
  Total 11 commit modular (melebihi syarat minimal 5). Lihat
  #link("https://github.com/KagChi/anteraja-capstone-samuel/tree/7-prototype")[branch 7-prototype].
]
