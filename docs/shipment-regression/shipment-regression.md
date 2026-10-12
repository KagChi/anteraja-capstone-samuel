# Day 21 — Browser Automation & Regression Testing (Anteraja Instant)

| | |
| --- | --- |
| **Produk** | Anteraja Instant — aplikasi kurir Satria (shipment request flow) |
| **Stack automation** | Node.js + **Puppeteer 25** (Chrome for Testing), ESM |
| **Aplikasi diuji** | Laravel 13 + Inertia v2 + React 19, disajikan di `http://127.0.0.1:8123` |
| **Akun demo** | `budi.pratama@anteraja.example.com` / `password` |
| **Materi** | Day 5 Week 4 — *Browser Automation & Regression Testing* |
| **Kode** | `tests/automation/` (lihat juga `tests/automation/README.md`) |
| **Bukti** | `docs/shipment-regression/evidence/` + `tests/automation/artifacts/<run-id>/` |

Alur bisnis yang diotomatisasi adalah **shipment request kurir**, dari membuka
tugas sampai hasilnya terverifikasi di riwayat:

**Open Form → Fill Shipment Data → Screenshot → Submit → Wait for Navigation →
Open Request History → Verify Result**

---

## 1. Ringkasan

Tiga sesi di materi diterjemahkan menjadi tiga skrip yang bisa dijalankan
terpisah, dengan satu library bersama:

| Sesi | Skrip | Perintah | Keluaran |
| --- | --- | --- | --- |
| 1 — Browser Automation Fundamentals | `session-1-fundamentals.mjs` | `bun run automation:basics` | Walkthrough + 3 screenshot |
| 2 — Shipment End-to-End Automation | `session-2-shipment-e2e.mjs` | `bun run automation:e2e` | 1 skenario dieksekusi lalu dinilai (PASS/FAIL) |
| 3 — Data-Driven Regression Testing | `session-3-regression.mjs` | `bun run automation:regression` | Semua skenario + screenshot + `test-results.json` |

Bedanya dengan browser automation biasa: sesi 1 hanya menggerakkan browser,
sesi 2 menambahkan penilaian **Expected Result ↔ Actual Result → PASS/FAIL**,
dan sesi 3 memisahkan test data ke JSON sehingga satu skrip menjalankan banyak
skenario tanpa menduplikasi kode.

---

## 2. Sesi 1 — Browser Automation Fundamentals

```bash
bun run automation:basics
```

Konsep yang diperagakan: **Open Page → Wait for Element → Interact → Continue**.

| Langkah | Yang dijalankan | Selector / API |
| --- | --- | --- |
| Open Page | buka halaman login | `page.goto('/login')` |
| Wait for Element | tunggu field email benar-benar ada | `#email` |
| Read the DOM | baca judul dan daftar field | `page.title()`, `page.$$eval()` |
| Interact | isi kredensial kurir dan submit | `#email`, `#password`, `button[type=submit]` |
| Continue | tunggu daftar tugas muncul | `#task-container article[data-tracking]` |
| Dom Selector | baca `data-tracking` dari setiap kartu tugas | `article[data-tracking]` |
| Mock GPS | arahkan fix perangkat ke tujuan | `page.setGeolocation()` |
| Wait for Element | tunggu PIN demo 6 digit terbit | `#pin-hint`, `#pin-form` |

Dua hal yang muncul di sesi ini dan berlaku untuk sesi berikutnya:

1. **Inertia berpindah halaman tanpa memuat dokumen baru.** Tidak ada event
   navigasi yang bisa ditunggu, jadi automation menunggu elemen atau URL
   (`page.waitForFunction` memeriksa `location.pathname`), bukan
   `waitForNavigation`.
2. **Status GPS punya dua fase.** Pill status mulai dari "Mencari sinyal GPS…"
   dan baru berubah setelah fix perangkat tiba, sehingga skenario menunggu
   verdict radius sebelum membaca teksnya.

---

## 3. Sesi 2 — Shipment End-to-End Automation

Sebelum automation dibuat, ditetapkan dulu **manual baseline** dan expected
result-nya (tersimpan di `tests/automation/data/shipment-cases.json`):

| # | Langkah manual | Expected |
| --- | --- | --- |
| 1 | Login kurir, buka `/courier/tugas` | Daftar tugas tampil |
| 2 | Pilih `AJ2509000011`, tekan **Mulai Antar** | Masuk `/courier/verifikasi?tracking=AJ2509000011` |
| 3 | Halaman verifikasi | Jarak ke tujuan tampil, status "Di dalam radius (Aman)", PIN demo 6 digit terbit |
| 4 | Isi PIN + hubungan penerima, tekan **Lanjut Ambil Bukti Foto** | PIN terverifikasi, lanjut ke `/courier/bukti-foto` |
| 5 | Ambil foto bukti, tekan **Konfirmasi & Selesaikan** | POD tersimpan, lanjut ke `/courier/sukses` |
| 6 | Halaman sukses | Judul "Pengiriman Berhasil" + nomor resi |
| 7 | Buka `/courier/riwayat` | Resi muncul dengan label **Terverifikasi** |

**Expected result:** shipment selesai (delivered), bukti foto tersimpan dengan
jarak ke tujuan, dan baris riwayat kurir menampilkan label "Terverifikasi".

```bash
bun run automation:e2e            # default: happy-path-delivery
node tests/automation/session-2-shipment-e2e.mjs edge-pin-lockout
```

Skrip mencetak baseline, menjalankan aksi di browser, lalu berpindah ke bagian
*automated testing*: setiap check membandingkan expected dengan actual dan
hasilnya PASS/FAIL. Screenshot diambil pada titik form terisi, bukti foto,
halaman sukses, dan riwayat.

---

## 4. Sesi 3 — Data-Driven Regression Testing

```bash
bun run automation:regression              # semua skenario
bun tests/automation/session-3-regression.mjs negative   # per kategori
```

Test data dipisahkan ke `tests/automation/data/shipment-cases.json`; satu
skrip mengeksekusi semuanya. Enam skenario mencakup tiga kategori yang diminta:

| ID | Kategori | Input | Expected |
| --- | --- | --- | --- |
| `happy-path-delivery` | Happy path | PIN benar (`123456`), hubungan "Keluarga", fix 25 m dari tujuan, akurasi 12 m | Selesai di `/courier/sukses`, riwayat "Terverifikasi" |
| `negative-incomplete-pin` | Negative | PIN baru 4 digit, tekan Enter | Toast "Lengkapi 6 digit PIN terlebih dahulu.", tetap di form, tombol lanjut tetap terkunci |
| `negative-wrong-pin` | Negative | PIN `000000` | Toast "PIN salah. Coba lagi.", field dikosongkan, server mencatat percobaan ke-1 dari 3, tetap di form |
| `edge-pin-lockout` | Edge case | 3 × PIN salah | Banner "PIN Terkunci", tombol lanjut terkunci |
| `edge-mock-gps-blocked` | Edge case | Fix di tujuan tapi akurasi 0 m (ciri lokasi simulasi) | POD ditolak: "Akurasi GPS tidak wajar"; permintaan peninjauan tersimpan "Menunggu Keputusan Admin" |
| `edge-outside-geofence` | Edge case | Fix jauh dari tujuan (`-6.3, 106.9`) | Kartu pengecualian radius muncul, wajib kirim alasan; setelah tersimpan status "Tercatat" dan pengiriman boleh dilanjutkan |

Setiap skenario menghasilkan:

- **PASS/FAIL** beserta daftar check (expected vs actual),
- **screenshot evidence** per langkah (dan `--99-failure.png` bila gagal),
- baris di **`test-results.json`** bersama ringkasan `summary.total/passed/failed`.

Agar bisa dijalankan ulang setelah aplikasi berubah, runner memanggil
`php artisan demo:reset-shipments <tracking>` sebelum setiap skenario:
POD, pengecualian, permintaan GPS lock dan flow event dihapus, PIN diterbitkan
ulang, dan shipment kembali `pending`.

---

## 5. Hasil eksekusi terakhir

| Sesi | Perintah | Hasil |
| --- | --- | --- |
| 1 | `bun run automation:basics` | PASS (walkthrough, 3 screenshot) |
| 2 | `bun run automation:e2e` | PASS — 7/7 check `happy-path-delivery` |
| 3 | `bun run automation:regression` | **6/6 skenario PASS** |

Contoh check yang dinilai pada happy path (dari `test-results.json`):

| Check | Expected | Actual |
| --- | --- | --- |
| Geofence menerima kurir | "Di dalam radius" | "Di dalam radius (Aman)" |
| PIN demo terbit | 6 digit | `123456` |
| Pindah ke langkah bukti | `/courier/bukti-foto` | `/courier/bukti-foto?tracking=AJ2509000011` |
| Fix diterima untuk POD | "ke tujuan" | "25 m ke tujuan • akurasi ±12 m" |
| Halaman sukses | "Pengiriman Berhasil" | "Pengiriman Berhasil" |
| Baris riwayat | memuat "Terverifikasi" | `AJ2509000011 Terverifikasi Fajar Nugraha • 25 m dari tujuan` |

Bukti mentah tersimpan di `tests/automation/artifacts/<run-id>/`
(screenshot + `test-results.json`); ketiga run terakhir:

| Sesi | Run ID | git commit |
| --- | --- | --- |
| 1 | `2026-10-12T14-46-48-session-1` | `2592ae3` |
| 2 | `2026-10-12T14-47-02-session-2` | `2592ae3` |
| 3 | `2026-10-12T14-54-53-session-3` | `2592ae3` |

Salinan ringkasnya ada di `docs/shipment-regression/evidence/`:
`session-{1,2,3}-test-results.json` plus satu screenshot kunci per skenario
(happy path terisi, halaman sukses, baris riwayat, validasi PIN, PIN terkunci,
POD diblokir GPS, pengecualian radius tercatat).

---

## 6. Temuan: PIN demo ditolak karena hash lama

Automation menemukan defect data yang tidak terlihat saat pengujian manual
sebelumnya. Gejalanya: PIN demo yang ditampilkan aplikasi (`123456`) selalu
ditolak server, sehingga langkah verifikasi tidak pernah membuka langkah
berikutnya.

Penyebabnya ada di dataset: seluruh `pin_challenges` pada database demo
tersimpan dengan hash acak dari versi seeder lama, sedangkan aplikasi sekarang
menerbitkan PIN demo tetap `123456` (`PinService::DEMO_PIN`). Pemeriksaan
`hash_equals(code_hash, sha256('pin:123456'))` selalu gagal, dan
`demo:reset-shipments` hanya me-reset status/attempt tanpa menulis ulang
`code_hash`.

Perbaikan yang dipakai (dua file + satu test):

- `PinService::demoCode()` / `PinService::demoHash()` menjadi satu sumber
  untuk kode demo dan hash-nya.
- `demo:reset-shipments` ikut menulis ulang `code_hash` sesuai policy panjang
  PIN segmen, jadi shipment dari dataset lama tetap bisa didemokan.
- `tests/Feature/Console/ResetDemoShipmentsTest.php` mengunci perilaku itu:
  challenge yang di-seed dengan hash acak `160746`, status `locked`, dan 2
  percobaan harus kembali `pending` dan menerima PIN demo.

```bash
php artisan test --filter=ResetDemoShipmentsTest   # 1 passed (5 assertions)
php artisan test                                    # 87 passed, 2 skipped (Redis)
```

---

## 7. Cara menjalankan ulang

1. Siapkan database dan aplikasi:

   ```bash
   docker compose up -d postgis
   php artisan migrate --seed
   php artisan serve --host=127.0.0.1 --port=8123
   ```

2. Jalankan suite:

   ```bash
   bun install                       # sekali saja: Puppeteer + Chrome for Testing
   bun run automation:basics
   bun run automation:e2e
   bun run automation:regression
   ```

3. Untuk menonton prosesnya di browser:

   ```bash
   AUTOMATION_HEADLESS=0 AUTOMATION_SLOWMO=120 bun run automation:e2e
   ```

Suite ini hanya butuh satu hal: aplikasi berjalan di
`AUTOMATION_BASE_URL` (default `http://127.0.0.1:8123`) dan perintah
`php artisan` bisa dijalankan dari root repo (untuk reset data).

---

## 8. Catatan dan batasan

- Suite berjalan **sekuensial** karena tiap skenario memakai data demo yang
  sama (`AJ2509000011`); reset per skenario yang membuatnya aman diulang.
- Skrip menulis ke database demo melalui alur aplikasi (login, PIN, POD), bukan
  dengan memanipulasi tabel langsung.
- `bun run test:e2e` (Playwright) masih memakai shipment lama
  `AJ2509001001` yang tidak ada di dataset 1000 resi sekarang, jadi spec
  `courier.spec.ts` bagian happy path perlu disesuaikan terpisah; suite
  Puppeteer di `tests/automation/` tidak bergantung padanya.
- `php artisan test` memerlukan PostGIS lokal (port `55432`); aplikasi sendiri
  bisa diarahkan ke Postgres lain lewat `.env`.
