// ============================================================
//  Satria Rapid Field Dispatch — Dokumentasi UI Design
//  Compile: typst compile ui-documentation.typ
// ============================================================

#let magenta = rgb("#E00065")
#let yellow  = rgb("#FFCF0E")
#let green   = rgb("#00834B")
#let ink     = rgb("#1C1B1B")
#let soft    = rgb("#FCF9F8")
#let hair    = rgb("#EAE7E7")

#let font-body = ("Plus Jakarta Sans", "Helvetica Neue", "Arial")

#set page(
  paper: "a4",
  margin: (x: 1.8cm, top: 1.6cm, bottom: 1.8cm),
  header: context {
    if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: luma(45%))
      grid(
        columns: (1fr, auto),
        align: (left, right),
        [Satria Rapid Field Dispatch — UI Design],
        [Anteraja Capstone · branch #text(fill: magenta, weight: "bold")[5-ui]],
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
      [Dokumentasi Rancangan Antarmuka Pengguna],
      [Halaman #counter(page).display() dari #counter(page).final().first()],
    )
  ],
)

#set text(font: font-body, size: 10pt, fill: ink)
#set par(justify: true, leading: 0.75em)
#set heading(numbering: none)

#show heading.where(level: 1): it => {
  v(0.6em)
  text(size: 17pt, weight: "bold", fill: magenta, it.body)
  v(0.15em)
  line(length: 100%, stroke: 1.4pt + yellow)
  v(0.3em)
}
#show heading.where(level: 2): it => {
  v(0.4em)
  text(size: 12.5pt, weight: "bold", fill: ink, it.body)
  v(0.1em)
}
#show heading.where(level: 3): it => {
  v(0.2em)
  text(size: 10.5pt, weight: "bold", fill: green, it.body)
  v(0.05em)
}

#let pill(label, bg, fg: white) = box(
  fill: bg,
  inset: (x: 0.5em, y: 0.18em),
  radius: 999pt,
  text(fill: fg, size: 8pt, weight: "bold", label),
)

#let frd(badge) = [
  #v(0.2em)
  #pill("FRD", green) #h(0.3em) #text(size: 9pt, weight: "bold", fill: green)[#badge]
]

#let meta-table(rows) = table(
  columns: (4.2cm, 1fr),
  inset: (x: 0.6em, y: 0.45em),
  stroke: (x, y) => if x == 1 { (left: 0.6pt + hair) } else { none },
  align: (left, left),
  ..rows.map(((k, v)) => (
    text(weight: "bold", size: 9pt, fill: luma(30%), k),
    text(size: 9pt, v),
  )).flatten(),
)

#let screens = (
  (
    file: "mobile-01-daftar-tugas-pengiriman.webp",
    title: "Daftar Tugas Pengiriman",
    tag: "Mobile",
    width: 30%,
    desc: "Daftar stop aktif untuk satu kurir (Satria #4821 • Jak-Sel), diurutkan berdasarkan jarak. Kartu paket menampilkan tujuan, jarak & estimasi waktu, AWB bergaya barcode-tracking, serta badge segmen (Instant / Same-Day) dan penanda COD atau wajib PIN. Aksi bawah: tombol Pindai Resi dengan navigasi Tugas / Verifikasi / Riwayat / Profil.",
    frd: "FRD-03 (badge Perlu PIN menandai paket Instant/Same-Day), FRD-04 (jarak kurir ↔ titik tujuan 250 m • 4 mnt).",
  ),
  (
    file: "mobile-02-verifikasi-lokasi-pin.webp",
    title: "Verifikasi Lokasi (PIN)",
    tag: "Mobile",
    width: 30%,
    desc: "Layar serah terima. Menampilkan status geofence (28 m — Di dalam radius (Aman), presisi GPS ±3 m, sinkronisasi PostGIS terverifikasi), input PIN otorisasi penerima, serta konfirmasi serah fisik (nama penerima, hubungan, pilihan Satpam/Keluarga/Langsung). Percobaan PIN dibatasi 1 dari 3.",
    frd: "FRD-01 (indikator jarak + status radius), FRD-03 (input PIN otorisasi), FRD-04 (konteks titik temu).",
  ),
  (
    file: "mobile-03-ambil-bukti-foto.webp",
    title: "Ambil Bukti Foto",
    tag: "Mobile",
    width: 28%,
    desc: "Viewfinder kamera in-app untuk Proof of Delivery. Watermark lokasi & waktu resmi disematkan otomatis (15:14 WIB • Senopati, Jaksel), menampilkan nama penerima dan kondisi paket. Aksi: Konfirmasi & Selesaikan atau Ambil Ulang Foto.",
    frd: "FRD-02 (foto bukti ber-watermark koordinat, alamat, penerima, tanggal, timestamp).",
  ),
  (
    file: "mobile-04-konfirmasi-sukses.webp",
    title: "Konfirmasi Sukses",
    tag: "Mobile",
    width: 30%,
    desc: "Konfirmasi pengiriman tuntas dengan ringkasan integritas audit: radius geofence valid, status verifikasi PIN, stempel waktu NTP, dan kode hash audit. Menutup alur dan menawarkan lanjut ke tugas berikutnya.",
    frd: "FRD-01 (radius geofence valid 28 m, batas 100 m), FRD-03 (PIN tervalidasi), FRD-05 (kode hash audit AUD-SEC-9912-SHA256, stempel NTP).",
  ),
  (
    file: "desktop-01-dashboard-pengiriman.webp",
    title: "Dashboard Pengiriman",
    tag: "Desktop",
    width: 100%,
    desc: "Ringkasan operasional harian (142 pengiriman hari ini • 4 perlu tinjauan • 138 terverifikasi otomatis). Tabel pengiriman dengan filter status (Semua / Perlu Tinjauan / Terkirim / Pengecualian), layanan, dan wilayah; kolom kurir, nomor resi, layanan, status, dan integritas.",
    frd: "FRD-01 (menandai pengiriman yang perlu tinjauan geofence), FRD-04 (konteks wilayah/koordinat per pengiriman).",
  ),
  (
    file: "desktop-02-detail-audit-trail.webp",
    title: "Detail Audit Trail",
    tag: "Desktop",
    width: 62%,
    desc: "Satu halaman audit lengkap untuk satu resi (ANT-INST-8829104): ringkasan layanan & rute, validasi geofence, visual peta titik tujuan vs posisi kurir (+12 m, radius 50 m), riwayat event, POD, dan status PIN. Menyediakan Ekspor Audit (PDF).",
    frd: "FRD-05 (seluruh jejak audit: event, POD, PIN, geofence, dan titik temu dalam satu tampilan).",
  ),
  (
    file: "desktop-03-antrian-pengecualian.webp",
    title: "Antrian Pengecualian",
    tag: "Desktop",
    width: 100%,
    desc: "Antrian persetujuan dispensasi lokasi kurir di luar radius resmi (4 menunggu). Tabel pengajuan menampilkan kurir, resi, layanan, deviasi (+55m, maks 30m), alasan, dan aksi tinjau. Tersedia filter layanan, pencarian, dan auto-sync.",
    frd: "FRD-01 (jalur alternatif tercatat saat tombol terkunci karena di luar radius).",
  ),
  (
    file: "desktop-03b-modal-detail-pengecualian.webp",
    title: "Modal Detail Pengecualian",
    tag: "Desktop",
    width: 100%,
    desc: "Modal tinjauan Detail Pengecualian Geofence untuk satu tiket (Instant #ANT-99201). Menampilkan kurir (Budi Pratama • SAT-8821) dan waktu tiket, ringkasan deviasi (Selisih +64m, toleransi hub 30m, jarak aktual 94m, status GPS Valid), alasan kurir, serta thumbnail Foto Bukti Lokasi (POD) dengan koordinat. Aksi: Tolak atau Setujui Pengecualian.",
    frd: "FRD-01 (keputusan dispensasi geofence tercatat), FRD-05 (detail tiket bagian dari jejak audit).",
  ),
  (
    file: "desktop-04-pengaturan-radius.webp",
    title: "Pengaturan Radius",
    tag: "Desktop",
    width: 100%,
    desc: "Kebijakan geofence sistem (Fleet Safety Protocol v4.2). Admin menetapkan batas toleransi jarak GPS per segmen layanan (Instant, Same-Day, Reguler) dengan preset standar operasional dan penyesuaian manual.",
    frd: "FRD-01 (konfigurasi radius geofence yang mengunci tombol selesai).",
  ),
)

// ------------------------------------------------------------
//  COVER
// ------------------------------------------------------------
#page(header: none, footer: none)[
  #v(1.2cm)
  #text(size: 9pt, weight: "bold", fill: magenta)[ANTERAJA CAPSTONE · BRANCH 5-UI]
  #v(0.3em)
  #text(size: 30pt, weight: "bold", fill: ink)[Satria Rapid Field Dispatch]
  #v(0.1em)
  #text(size: 16pt, fill: luma(35%))[Dokumentasi Rancangan Antarmuka Pengguna]
  #v(0.5em)
  #line(length: 100%, stroke: 2pt + yellow)
  #v(1.0em)

  #box(
    width: 100%,
    fill: soft,
    stroke: 0.6pt + hair,
    radius: 8pt,
    inset: 1em,
  )[
    #meta-table((
      ("Produk", "Anteraja — Satria Rapid Field Dispatch"),
      ("Fokus", "Pengiriman berbasis geolokasi (geofencing, PoD, PIN, audit klaim)"),
      ("Design system", "Satria Rapid Field Dispatch — warna, tipografi, spacing, komponen"),
      ("Platform", "Mobile (kurir lapangan) & Desktop (Admin/Hub)"),
      ("Alur kurir", "Tugas → Verifikasi Lokasi & PIN → Bukti Foto → Konfirmasi Sukses"),
      ("Alur admin", "Dashboard → Detail Audit Trail → Antrian Pengecualian → Pengaturan Radius"),
      ("Referensi", "docs/frd/ (FRD-01 s.d. FRD-05) & docs/PRD-anteraja-instant.md"),
      ("Repositori", "branch 5-ui · docs/ui/"),
    ))
  ]

  #v(1em)
  #heading(level: 1)[Ringkasan]

  Dokumen ini memuat hasil rancangan antarmuka *Satria Rapid Field Dispatch* untuk
  aplikasi Anteraja. Desain diturunkan dari _Functional Requirement Document_ (FRD)
  dan PRD, lalu diwujudkan menjadi satu *design system* dengan dua platform: aplikasi
  *mobile* untuk kurir lapangan dan konsol *desktop* untuk Admin/Hub. Seluruh layar
  disajikan sebagai screenshot berformat WebP dan dipetakan ke FRD yang dijawabnya.

  #v(0.6em)
  #grid(
    columns: (1fr, 1fr),
    gutter: 0.8em,
    box(fill: soft, stroke: 0.6pt + hair, radius: 6pt, inset: 0.8em)[
      #text(weight: "bold", fill: magenta)[Mobile — Aplikasi Kurir] \
      #v(0.2em)
      Empat layar alur kurir, viewport 706–780 px, optimasi *single-hand* dan
      *glove touch* untuk navigasi motor.
    ],
    box(fill: soft, stroke: 0.6pt + hair, radius: 6pt, inset: 0.8em)[
      #text(weight: "bold", fill: magenta)[Desktop — Konsol Admin/Hub] \
      #v(0.2em)
      Lima layar operasional & konfigurasi, resolusi tinggi (2560–2824 px) untuk
      pemantauan dan audit.
    ],
  )

  #v(1.2em)
  #heading(level: 1)[Daftar Isi]

  #set text(size: 10pt)
  1. Prinsip Desain & Design System
  2. Rancangan Mobile — Aplikasi Kurir
  3. Rancangan Desktop — Konsol Admin/Hub
  4. Pemetaan ke Functional Requirement (FRD)
  5. Catatan Implementasi
]

// ------------------------------------------------------------
//  DESIGN SYSTEM
// ------------------------------------------------------------
#page[
  #heading(level: 1)[1. Prinsip Desain & Design System]

  Desain menyeimbangkan presisi taktis dengan energi konsumen yang optimistis, dengan
  prinsip: *tactical speed & optimism*, *glanceable utility* (keterbacaan di bawah sinar
  matahari), *verification confidence* (kejelasan bukti serah terima), dan gaya
  *logistics-minimalism* berkontras tinggi.

  #v(0.4em)
  #heading(level: 2)[Palet Warna]
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 0.6em,
    ..(
      ("#E00065", magenta, white, "Primary", "Aksi utama, konfirmasi operasional, tab aktif, progress."),
      ("#FFCF0E", yellow, ink, "Secondary", "Aksen urgensi, badge ekspedisi, peringatan penting."),
      ("#00834B", green, white, "Tertiary", "Konfirmasi sukses, verifikasi geofence, tanda selesai."),
    ).map(((hex, col, fg, name, use)) => box(
      width: 100%, stroke: 0.6pt + hair, radius: 6pt, clip: true,
    )[
      #box(width: 100%, height: 1.5cm, fill: col)
      #box(width: 100%, inset: 0.6em)[
        #text(weight: "bold", size: 9.5pt)[#name] #text(size: 8pt, fill: luma(40%))[#hex] \
        #v(0.2em)
        #text(size: 8.5pt, use)
      ]
    ]),
  )

  #v(0.8em)
  #heading(level: 2)[Tipografi]
  Seluruh antarmuka memakai *Plus Jakarta Sans*. Kode AWB & serial memakai pelacakan
  karakter yang diperlebar (+0.08em) agar angka `0/8` dan huruf `O/B` tidak tertukar.
  Metrik operasional dirender pada headline *bold/extrabold* dengan letter spacing
  rapat untuk keterbacaan sekilas; label mikro memakai bobot tebal berkontras tinggi.

  #v(0.8em)
  #heading(level: 2)[Spacing, Bentuk & Elevasi]
  - *Grid:* 4 kolom, margin luar 1rem, gutter 0.75rem (mobile); area bawah 88–104 px
    disisihkan untuk aksi melekat (pindai, serah terima, panggil).
  - *Radius:* kartu paket 8–12 px, tombol/input 12 px, status pill penuh (`9999px`),
    bottom drawer 16–24 px.
  - *Elevasi:* kanvas datar `#FCF9F8`, kartu putih berbatas 1px `#EAE7E7`, stop aktif
    diberi indikator kuning/magenta, FAB & drawer mengambang paling atas.
]

// ------------------------------------------------------------
//  SCREENS
// ------------------------------------------------------------
#page[
  #heading(level: 1)[2. Rancangan Mobile — Aplikasi Kurir]

  #for (i, s) in screens.enumerate() [
    #if s.tag == "Mobile" [
      #heading(level: 2)[#s.title]
      #grid(
        columns: (1fr, 1.5fr),
        gutter: 1em,
        align: (center + horizon, top),
        box(
          fill: soft, stroke: 0.6pt + hair, radius: 8pt, inset: 0.5em,
          image(s.file, width: s.width),
        ),
        [
          #text(size: 8pt, weight: "bold", fill: magenta)[MOBILE · KURIR]
          #v(0.3em)
          #s.desc
          #frd(s.frd)
        ],
      )
      #v(0.8em)
    ]
  ]

  #v(0.5em)
  #heading(level: 1)[3. Rancangan Desktop — Konsol Admin/Hub]

  #for s in screens [
    #if s.tag == "Desktop" [
      #heading(level: 2)[#s.title]
      #box(
        width: 100%, fill: soft, stroke: 0.6pt + hair, radius: 8pt, inset: 0.5em,
        image(s.file, width: s.width),
      )
      #v(0.35em)
      #text(size: 8pt, weight: "bold", fill: magenta)[DESKTOP · ADMIN/HUB]
      #v(0.25em)
      #s.desc
      #frd(s.frd)
      #v(0.8em)
    ]
  ]
]

// ------------------------------------------------------------
//  FRD MAPPING
// ------------------------------------------------------------
#page[
  #heading(level: 1)[4. Pemetaan ke Functional Requirement (FRD)]

  #table(
    columns: (1.7cm, 1fr, 1fr),
    inset: 0.6em,
    stroke: 0.6pt + hair,
    align: (center, left, left),
    fill: (_, y) => if y == 0 { magenta } else { if calc.rem(y, 2) == 0 { soft } else { white } },
    table.header(
      text(fill: white, weight: "bold", size: 9pt)[FRD],
      text(fill: white, weight: "bold", size: 9pt)[Ketentuan],
      text(fill: white, weight: "bold", size: 9pt)[Dijawab oleh layar],
    ),
    [*01*], [Geofencing lock — tombol Selesai hanya aktif di dalam radius],
      [Mobile Verifikasi Lokasi & Konfirmasi Sukses; Desktop Dashboard, Antrian Pengecualian, Modal Pengecualian, Pengaturan Radius],
    [*02*], [Proof of Delivery ber-geotag & watermark],
      [Mobile Ambil Bukti Foto & Konfirmasi Sukses],
    [*03*], [Verifikasi PIN per segmen layanan (Instant/Same-Day)],
      [Mobile Daftar Tugas, Verifikasi Lokasi, Konfirmasi Sukses],
    [*04*], [Matchmaking lokasi kurir ↔ pembeli],
      [Mobile Daftar Tugas & Verifikasi Lokasi; Desktop Dashboard],
    [*05*], [Audit trail & investigasi klaim],
      [Mobile Konfirmasi Sukses; Desktop Detail Audit Trail & Modal Pengecualian],
  )

  #v(1em)
  #heading(level: 1)[5. Catatan Implementasi]
  - Palet: magenta `#E00065`, kuning energetik `#FFCF0E`, hijau verifikasi `#00834B`.
  - Tipografi: Plus Jakarta Sans.
  - Screenshot dikonversi dari PNG ke WebP (kualitas 90) dengan `cwebp`.
  - Resolusi: mobile 706–780 px; desktop 2560×2048, 2560×3002, 2696×2048, dan modal 2824×1614.
  - Berkas sumber berada pada `docs/ui/` di branch `5-ui`; dokumen ini dihasilkan dari
    sumber Typst (`ui-documentation.typ`).
]
