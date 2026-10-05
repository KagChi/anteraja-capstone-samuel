# Decisions — FRD-02 (geotagged & watermarked POD)

Recorded per the FRD instruction that unstated conditions are decided by the
implementing agent. Each item names the choice and the reason behind it.

## Storage: private `pod` disk with an S3 mode

- POD objects never touch a public disk. A dedicated `pod` filesystem disk
  is configured in `config/filesystems.php`: `POD_DISK=s3` uses the AWS
  SDK (Flysystem S3 driver) with private visibility, while the default
  `POD_DISK=local` keeps the same private semantics under
  `storage/app/private/pod` so the app runs without cloud credentials.
- Access (FR-02-06) goes through `GET /api/v1/admin/proofs/{id}/photo`, a
  Laravel **signed** route restricted to admins. On S3 the controller answers
  with a short-lived presigned object URL; locally it streams the object with
  no public path exposed. Raw paths are never returned to the courier.
- The courier response only returns review metadata (`review_status`,
  `distance_to_destination_m`, `watermark_hash`), matching the FRD role
  table where only admins/CS can view POD contents.

## Watermark (FR-02-04/05/07)

- Rendering happens server-side with GD, before the object is written. The
  font is bundled at `resources/fonts/PlusJakartaSans.ttf` so the build is
  reproducible.
- The watermark carries the tracking number, coordinates (6-decimal
  precision), destination address, recipient name and the server timestamp in
  WIB; the photo is downscaled to a maximum width of 1080 px before stamping.
- `watermark_hash` is the SHA-256 of the canonical payload
  `tracking|coordinates|address|recipient|captured_at(UTC)`. The same values
  are stored on `delivery_proofs`, so an auditor can recompute the digest
  from the row and detect a later change (a test asserts this round-trip).
- Reverse geocoding for the address line uses the shipment's destination
  address instead of calling Nominatim during capture: the coordinates are
  printed next to it on the watermark, the geofence already binds the capture
  to that destination, and dropping the external dependency keeps capture
  deterministic. Swapping in a real reverse geocoder only changes the
  `watermark_address` source in `ProofService`.

## Timestamps

- `delivery_proofs.captured_at` / `device_captured_at` and
  `shipments.delivered_at` are persisted as **UTC instants**; the Jakarta
  wall clock is only used for display and for the watermark text. (Carbon
  values passed straight into Eloquent keep their wall-clock digits, which
  would otherwise shift a WIB value by seven hours in the audit trail.)
- `device_captured_at` is advisory: a gap larger than 15 minutes against
  the server clock marks the POD `needs_review` and raises
  `device_time_mismatch`, but the capture is still accepted and
  investigated later (FR-02-08).

## Attempts and review

- Several POD attempts per shipment are allowed, but only one stays `valid`
  (enforced by the partial unique index). A newer valid attempt supersedes
  the previous one, which is demoted to `invalid` with an explanatory note.
- FR-02-09 is implemented as `POST /api/v1/admin/proofs/{id}/review` with
  `decision=invalid|valid` and a mandatory reason when invalidating. The
  decision writes `reviewed_by`/`reviewed_at`, an `admin_actions` row
  (`review_pod` / `delivery_proof`), an `audit_access_logs` entry, and
  raises or resolves the `pod_invalid` anomaly flag (weight 3.0).

## Camera and GPS (courier app)

- FR-02-01 (no gallery uploads) is enforced client-side: the courier page only
  offers a live `getUserMedia` viewfinder plus a canvas capture, and the
  API requires the `photo` part together with valid coordinates.
- GPS uses `watchPosition` with high accuracy; the on-screen distance is a
  client-side aid only. The authoritative distance is recomputed with PostGIS
  on both the proof and the completion call, so a tampered client cannot fake
  proximity.

## FRD-06 (tambahan) — Deteksi GPS palsu

FRD-01 §9 menaruh deteksi spoofing GPS di luar cakupan; fitur ini
menaikkannya menjadi gerbang keras dengan jalur pembukaan oleh Admin.
Keputusan yang diambil:

- **Deteksi dua lapis.** Aplikasi kurir memasok bukti mentah (`accuracy`,
  `device_timestamp`, `speed`/`heading`/`altitude`, dan jendela `fixes`
  terakhir) dan menandai kecurigaan lebih awal untuk ditampilkan; server
  (`FakeGpsDetector`) menghitung ulang verdict dan memegang keputusan
  blokir. Aplikasi web tidak punya API mock-location (Android Chrome tidak
  mengekspos `isFromMockProvider`), jadi deteksi bersifat heuristik dan
  keterbatasan ini dicatat, bukan diakali.
- **Ambang kuat (blokir):** akurasi ≤ 0 m atau < 1 m; jendela beku ≥ 8 fix
  dengan koordinat identik 6 desimal selama ≥ 45 dtk dan akurasi ≤ 2 m;
  perpindahan mustahil > 200 km/j dengan jeda ≥ 60 dtk terhadap titik
  tercatat terakhir pada pengiriman yang sama (dihitung di server).
- **Ambang lemah (flag saja):** selisih jam perangkat > 15 mnt, fix
  kedaluwarsa > 10 mnt, lompatan sesi klien > 150 km/j, dan variasi sinyal
  rendah (≤ 2 titik berbeda selama ≥ 45 dtk dengan akurasi ≤ 5 m).
- **Blokir menutup POD dan penyelesaian.** `FakeGpsDetector::guard()`
  dijalankan sebelum ada baris/objek yang ditulis, jadi percobaan yang
  diblokir tidak menyisakan POD; hanya `gps_blocked` event yang dicatat
  sebagai bukti. Permintaan ulang dengan fix wajar lolos tanpa aksi Admin.
- **Satu flag untuk dua tingkat.** `mock_gps_suspected` berbobot 3.00 saat
  blokir dan 2.00 saat terduga (keduanya melewati ambang ≥ 2.00), dan
  bobotnya hanya naik, sehingga insiden terberat tetap terlihat.
- **Override per pengiriman lewat antrian persetujuan.** Kurir mengajukan
  lewat `POST /api/v1/courier/tasks/{tracking}/gps-lock` (alasan wajib),
  Admin memutuskan lewat antrian (tab "Blokir GPS"). Persetujuan membuka
  gerbang, tetapi POD yang lolos tetap `needs_review` dengan `override_id`
  di `gps_evidence`, dan keputusannya tertulis di `admin_actions` + event
  `gps_lock_decided`. Flag tidak pernah ditutup otomatis oleh override.
- **Ambang sebagai konstanta.** Nilai ada di `FakeGpsDetector` dan
  `resources/js/lib/fakeGps.ts`, mengikuti gaya bobot anomali lain yang
  memang hardcoded di service; tidak ada env baru.
- **Catatan Playwright.** `setGeolocation` bawaan berakurasi 0, yang kini
  terbaca sebagai ciri mock provider. Konfigurasi e2e memakai akurasi 12
  untuk alur normal, dan spec khusus menurunkan akurasi ke 0 untuk menguji
  blokir.

## FRD-03 (tambahan) — Dashboard pembuka blokir PIN

FR-03-08 sudah meminta "membuka blokir atau override dengan alasan", dan
schema-nya sudah menyiapkan kolom override plus action type `unlock_pin` /
`override_pin`; yang belum ada hanyalah surface admin-nya. Keputusan yang
diambil:

- **Dua keputusan, satu alasan wajib.** `unlock` mengembalikan tantangan ke
  `pending` dengan percobaan 0 dan masa berlaku baru sehingga kurir dapat
  memasukkan PIN lagi; `override` menyetel status `override` sehingga
  penyelesaian lolos tanpa PIN (FR-03-07). Keduanya wajib menuliskan alasan
  ≥ 5 karakter, tercatat di `admin_actions` (`unlock_pin`/`override_pin`)
  dan satu `delivery_events` bertipe `pin_verification` dengan metadata
  `result: unlocked|override`, `by`, dan `reason`.
- **Kirim ulang PIN tidak pernah membuka blokir.** Aplikasi kurir memanggil
  endpoint PIN di setiap page load untuk menampilkan kode demo;
  `PinService::issue` sekarang tidak lagi mereset `attempts`/`status` untuk
  tantangan `locked`/`verified`/`override`. Tanpa ini, sekadar reload
  halaman sudah membatalkan blokir dan dashboard admin tidak ada gunanya.
  Konsekuensinya percobaan salah juga tidak lagi hilang saat PIN dikirim
  ulang, sesuai FR-03-06.
- **Flag `repeated_pin_failure` diselesaikan oleh keputusan admin**; blokir
  berikutnya menaikkannya lagi (pola yang sama dengan `pod_invalid`).
- **Kurir melihat status dari server.** Payload tugas mendapat bagian `pin`
  (status, percobaan, override), halaman verifikasi menyinkronkan state
  darinya, menampilkan banner "PIN Terkunci" dengan tombol "Perbarui
  Status" dan banner override, serta menonaktifkan input saat terkunci.
- **Dashboard** `/admin/pin-terkunci` (nav "PIN Terkunci") memuat antrean
  default `locked` dengan filter `locked|expired|all`; modal tinjauan
  menampilkan percobaan terakhir dari event PIN sebelum admin memutuskan.

## FRD-04 (tambahan) — Matchmaking lokasi kurir ↔ pembeli

FRD-04 sudah punya tabel `meeting_points` + contoh seed, tetapi belum punya
service, endpoint, maupun UI. Keputusan yang diambil:

- **Posisi pembeli diinput kurir.** Purwarupa ini tidak punya sesi pembeli,
  jadi kurir menandai posisi pembeli di peta (opsional) saat mengusulkan
  titik temu; jarak tujuan → pembeli dihitung di server, disimpan di
  `distance_from_buyer_m` plus kolom baru `buyer_point`, dan ambang "perlu
  titik temu" 50 m (FR-04-03).
- **Persetujuan oleh Admin/CS.** Karena penerima tidak punya sesi, Admin/CS
  yang memutuskan di antrian persetujuan (tab "Titik Temu") — pola yang sama
  dengan FR-04-09 — dengan `approved_by_type = admin`. Kurir dapat mengajukan
  ulang setelah usulan ditolak atau kedaluwarsa.
- **Kedaluwarsa 30 menit** (FR-04-08). Usulan yang lewat batas ditandai
  `expired` secara lazy saat dibaca/ditulis bersama event
  `meeting_point_expired`, sehingga slot usulan terbuka lagi.
- **Geofence mengikuti titik final (FR-04-07).** Persetujuan memindahkan
  pusat geofence aktif ke titik final (`source = meeting_point`); keputusan
  radius POD kini memakai `fn_evaluate_geofence` (pusat aktif), bukan jarak
  ke alamat master, sementara `distance_to_destination_m` tetap jarak ke
  alamat master untuk audit. Admin juga dapat menetapkan titik lain
  (FR-04-09) lewat peta pada modal tinjauan (action `set_meeting_point`).
- **Jejak audit** memakai event `meeting_point_proposed/approved/rejected/
  expired` dan `admin_actions` (`approve_meeting_point`, `set_meeting_point`,
  `reject_meeting_point`), plus blok Titik Temu pada halaman audit trail.

## Celah FRD lain yang ikut ditutup

- **FR-05-08 (ekspor audit).** Tombol "Ekspor Data (CSV)" memakai endpoint
  `GET /api/v1/admin/shipments/{id}/audit-export` (bagian ringkasan, POD,
  PIN, geofence, anomali, event, admin action) dan mencatat akses `export`
  (FR-05-09). Tombol cetak PDF lama tetap dipertahankan.
- **FR-05-10 / PRD §9 (batas data kurir).** Kurir hanya membaca pengiriman
  miliknya lewat `/api/v1/shipments` (index ter-scope; detail milik kurir
  lain menjawab 404, bukan 403, agar tidak membocorkan keberadaan resi).
- **FR-03-04 (batas kirim ulang PIN).** Tombol "Kirim ulang PIN" mengirim
  `resend: true`; server menaikkan `resend_count` dan menolak setelah
  `pin_max_resends` (3) dari kebijakan segmen. Refresh saat halaman dibuka
  (yang dipakai untuk menampilkan kode demo) tidak dihitung, tetapi juga
  tidak pernah mereset blokir atau percobaan.
- **Nav kurir "Riwayat"/"Profil"** yang sebelumnya stub "belum tersedia"
  kini halaman nyata (`/courier/riwayat`, `/courier/profil`) dengan endpoint
  `GET /api/v1/courier/history` dan `GET /api/v1/courier/profile`.
- **Perbaikan kecil:** `expires_at` PIN kini disimpan sebagai UTC (dibutuhkan
  oleh perbandingan kedaluwarsa FR-03-04) karena nilai wall-clock Jakarta
  sebelumnya bisa bergeser 7 jam saat dibaca dari Postgres.
