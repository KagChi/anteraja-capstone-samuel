# FRD-06 — Deteksi GPS Palsu & Pembukaan Blokir oleh Admin

| | |
|---|---|
| **MCP** | PostgreSQL + PostGIS (Supabase) · Chrome DevTools |
| **Tingkat** | ★★★ |
| **Skill** | `feature-fake-gps-detection` |

> FRD ini adalah tambahan setelah FRD-01..05. Deteksi spoofing GPS dinyatakan *out of scope* di FRD-01 §9; dokumen ini menaikkannya menjadi fitur dengan gerbang keras (blokir) plus jalur pembukaan oleh Admin.

## 1. Ringkasan
POD dan tombol "Selesai" diblokir ketika server menemukan bukti kuat lokasi perangkat disimulasikan (ciri mock provider, koordinat beku, atau perpindahan mustahil antar titik tercatat). Kurir dapat meminta peninjauan; persetujuan Admin membuka blokir untuk pengiriman tersebut sementara insidennya tetap tercatat di jejak audit.

## 2. User Story
> Sebagai Admin operasional, saya ingin pengiriman tidak dapat dituntaskan dari lokasi yang dipalsukan, supaya pengiriman palsu tidak lolos verifikasi.

## Peran

| Aksi | Kurir | Admin/CS |
|---|---|---|
| Mengirim sinyal kualitas GPS pada POD/selesai | ✅ | ❌ |
| Melihat peringatan integritas GPS di aplikasi | ✅ | ❌ |
| Mengajukan peninjauan blokir GPS | ✅ | ❌ |
| Menyetujui/menolak peninjauan | ❌ | ✅ |
| Melihat bukti deteksi & riwayat keputusan | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| PostgreSQL + PostGIS (Supabase) | Menghitung jarak/kecepatan implisit antar `delivery_events`, menyimpan flag & permintaan peninjauan | Hasil query + baris tabel |
| Chrome DevTools | Mensimulasikan fix akurasi 0 dan koordinat beku untuk menguji blokir | Rekaman dua skenario |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-06-01 | Aplikasi kurir mengirim sinyal kualitas GPS (`accuracy`, `device_timestamp`, `speed`/`heading`/`altitude` opsional, dan jendela `fixes` terakhir) pada panggilan POD, selesai, dan pengajuan peninjauan. |
| FR-06-02 | Server memvalidasi bentuk, rentang, urutan, dan ukuran sinyal sebelum menilai. |
| FR-06-03 | Sinyal kuat memblokir POD **dan** penyelesaian dengan `422 FAKE_GPS_SUSPECTED`: akurasi ≤ 0 m / < 1 m, jendela beku (≥ 8 titik identik selama ≥ 45 dtk dengan akurasi ≤ 2 m), perpindahan mustahil (> 200 km/j dengan jeda ≥ 60 dtk antar titik tercatat pada pengiriman yang sama). |
| FR-06-04 | Sinyal lemah menandai POD `needs_review` tanpa memblokir: selisih jam perangkat > 15 mnt, fix kedaluwarsa > 10 mnt, lompatan sesi, variasi sinyal rendah. |
| FR-06-05 | Percobaan yang diblokir tetap dicatat sebagai `delivery_events` bertipe `gps_blocked` walaupun tidak ada objek/baris POD yang dibuat. |
| FR-06-06 | Flag anomali `mock_gps_suspected` (bobot 3.00 saat blokir, 2.00 saat terduga) tampil pada skor "perlu tinjauan". |
| FR-06-07 | Kurir dapat mengajukan peninjauan dengan alasan wajib; hanya bila fix saat ini terblokir atau ada riwayat `gps_blocked`. |
| FR-06-08 | Pengajuan muncul di antrian persetujuan Admin; maksimal satu pengajuan `pending` per pengiriman. |
| FR-06-09 | Admin menyetujui/menolak dengan catatan (wajib saat menolak). |
| FR-06-10 | Persetujuan membuka gerbang POD + penyelesaian untuk pengiriman itu; POD yang lolos lewat override tetap `needs_review` dan menyimpan `override_id`. |
| FR-06-11 | Setiap keputusan menulis `admin_actions`, event `gps_lock_decided`, dan tampil di jejak audit. |
| FR-06-12 | Audit trail menampilkan kartu "Integritas GPS": status, alasan, akurasi, kecepatan implisit, jendela fix, selisih jam, dan keputusan Admin. |
| FR-06-13 | Keputusan blokir selalu dihitung di server; klien hanya memasok bukti. |
| FR-06-14 | Pengajuan yang ditolak dapat diajukan ulang; fix yang wajar lolos tanpa aksi Admin. |

## 5. Business Rules
- Tidak ada jalur lain yang mengubah status menjadi `delivered` selain endpoint penyelesaian, sehingga gerbang FR-06 mencakup seluruh alur.
- Override bersifat per pengiriman dan tidak menghapus flag; insiden tetap terbuka sampai kasus ditutup.
- Ambang deteksi adalah konstanta di `FakeGpsDetector` dan `resources/js/lib/fakeGps.ts` (bukan kebijakan yang dapat diubah pengguna).

## 6. Data Model
Tabel baru `gps_lock_requests` (mengikuti konvensi `delivery_exceptions`), kolom `delivery_proofs.gps_accuracy_m` + `gps_evidence`, perluasan check constraint `anomaly_flags`, `delivery_events`, dan `admin_actions`, serta tipe event baru `gps_blocked`, `gps_lock_requested`, `gps_lock_decided`.

## 7. Acceptance Criteria
- [ ] **Given** perangkat melaporkan akurasi 0 m, **When** kurir mengonfirmasi POD, **Then** server menolak 422 `FAKE_GPS_SUSPECTED`, tidak ada POD tersimpan, dan event `gps_blocked` tercatat.
- [ ] **Given** jendela fix berisi ≥ 8 koordinat identik selama ≥ 45 dtk, **When** POD dikirim, **Then** permintaan ditolak dengan alasan `frozen_fix`.
- [ ] **Given** titik tercatat 30 km lalu 3 menit kemudian, **When** kurir menekan "Selesai", **Then** permintaan ditolak dengan alasan `impossible_travel`.
- [ ] **Given** selisih jam perangkat 30 menit, **When** POD dikirim, **Then** POD tersimpan `needs_review` dan flag `mock_gps_suspected` berbobot 2.00 tanpa blokir.
- [ ] **Given** kurir terblokir mengajukan peninjauan, **When** Admin menyetujui, **Then** POD ulang dan penyelesaian berhasil dengan POD tetap `needs_review` dan bukti override tersimpan.
- [ ] **Given** Admin menolak, **When** kurir mengulang dengan fix akurasi wajar, **Then** POD tersimpan dan penyelesaian berjalan tanpa aksi Admin.

## 8. Verifikasi via MCP
- [ ] **PostgreSQL + PostGIS:** baris `gps_lock_requests`, flag `mock_gps_suspected`, dan event `gps_blocked`/`gps_lock_decided`.
- [ ] **Chrome DevTools:** rekaman skenario akurasi 0 (blokir + pengajuan) dan fix wajar (lolos).
- [ ] Bukti keputusan di `docs/decisions.md`.

## 9. Out of Scope
API deteksi mock provider tingkat perangkat (tidak tersedia di web), pemeriksaan silang IP, pelacakan GPS berkelanjutan, dan pembukaan blokir otomatis.

## 10. Catatan untuk Agent
- Server: `app/Services/Verification/FakeGpsDetector.php`, `GpsLockService.php`, `app/Http/Controllers/Api/V1/Courier/GpsLockController.php`.
- Klien: `resources/js/lib/fakeGps.ts`, `resources/js/Hooks/useGeolocation.ts`, `resources/js/Pages/Courier/ProofPhoto.tsx`.

