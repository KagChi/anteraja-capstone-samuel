# FRD-05 — Audit Trail & Investigasi Klaim

| | |
|---|---|
| **MCP** | Supabase (PostGIS) · Sentry · Chrome DevTools |
| **Tingkat** | ★★ |
| **Skill** | `feature-claim-audit-trail` |

> FRD ini menjelaskan apa yang harus dibangun. Kondisi khusus yang tidak ditulis di sini, kamu yang putuskan dan catat di `decisions.md`.

## 1. Ringkasan
Admin/CS dapat membuka satu pengiriman dan melihat seluruh jejak audit dalam satu tampilan: seluruh `delivery_events`, POD beserta metadata, riwayat PIN, hasil geofence, dan titik temu. Sistem juga menandai anomali agar investigasi klaim tidak perlu menelusuri banyak sistem.

## 2. User Story
> Sebagai tim Customer Service, saya ingin melihat seluruh bukti satu pengiriman dalam satu halaman, supaya saya dapat menjawab klaim pelanggan dalam hitungan menit, bukan hari.

## Peran

| Aksi | Kurir | Admin/CS |
|---|---|---|
| Melihat audit trail pengirimannya sendiri | ✅ | ✅ |
| Melihat audit trail semua pengiriman | ❌ | ✅ |
| Menandai temuan investigasi | ❌ | ✅ |
| Menutup kasus klaim | ❌ | ✅ |
| Mengekspor audit trail | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| Supabase (PostGIS) | Menyusun query gabungan event, POD, PIN, dan geofence per pengiriman. | Hasil query audit lengkap |
| Sentry | Menangkap error pada alur investigasi dan korelasi dengan pengiriman. | Event error + tautan |
| Chrome DevTools | Menjalankan alur buka pengiriman → baca bukti → tutup kasus. | Rekaman alur investigasi |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-05-01 | Halaman `/admin/shipments/:trackingNumber` menampilkan seluruh `delivery_events` berurutan waktu. |
| FR-05-02 | Halaman menampilkan POD beserta koordinat, jarak, dan watermark. |
| FR-05-03 | Halaman menampilkan riwayat `pin_challenge`: status, jumlah percobaan, waktu verifikasi/override. |
| FR-05-04 | Halaman menampilkan hasil evaluasi geofence: jarak, radius, dan lulus/tidak. |
| FR-05-05 | Sistem menghitung skor anomali per pengiriman berdasarkan: jarak di luar radius, selisih waktu perangkat, PIN gagal berulang, dan POD perlu tinjauan. |
| FR-05-06 | Pengiriman dengan skor anomali di atas ambang ditandai "perlu tinjauan" di daftar admin. |
| FR-05-07 | Admin/CS dapat mencatat temuan investigasi dan menutup kasus klaim, dengan alasan tercatat. |
| FR-05-08 | Audit trail dapat diekspor (mis. CSV) untuk keperluan eskalasi. |
| FR-05-09 | Semua akses ke audit trail tercatat (siapa, kapan, pengiriman mana). |
| FR-05-10 | Kurir hanya dapat melihat audit trail pengiriman yang ditugaskan kepadanya. |

## 5. Business Rules

- Audit trail bersifat *read-only*; tidak ada data bukti yang dapat diubah dari halaman ini.
- Keputusan tutup kasus tidak menghapus data apa pun.
- Skor anomali adalah indikator untuk manusia, bukan penetapan kesalahan otomatis.
- Export hanya tersedia untuk Admin/CS dan tercatat di log akses.

## 6. Data Model
Memakai `delivery_events`, `delivery_proofs`, `pin_challenges`, dan `shipments`. Rancangan tabel `claim_cases` dan `anomaly_flags` dibuat sendiri mengikuti konvensi di PRD.

## 7. Acceptance Criteria

- [ ] **Given** satu pengiriman punya beberapa event, **When** admin membuka halaman, **Then** seluruh event tampil berurutan waktu.
- [ ] **Given** POD tersimpan, **When** audit trail dibuka, **Then** koordinat, jarak, dan watermark tampil.
- [ ] **Given** pengiriman punya jarak di luar radius dan PIN gagal berulang, **When** skor dihitung, **Then** pengiriman ditandai "perlu tinjauan".
- [ ] **Given** admin menutup kasus, **When** disimpan, **Then** status kasus tertutup beserta alasan dan identitas admin.
- [ ] **Given** kurir mengakses pengiriman milik kurir lain, **When** permintaan dibuat, **Then** akses ditolak.
- [ ] **Given** error terjadi saat memuat audit trail, **When** dicatat, **Then** Sentry menerima event dengan konteks pengiriman.

## 8. Verifikasi via MCP

- [ ] **Supabase (PostGIS):** hasil query audit lengkap untuk satu pengiriman dari dataset contoh.
- [ ] **Supabase (PostGIS):** hasil perhitungan skor anomali pada baris yang ditandai.
- [ ] **Sentry:** event error uji dari alur investigasi beserta konteks pengiriman.
- [ ] **Chrome DevTools:** rekaman buka pengiriman → baca bukti → tutup kasus.
- [ ] Bukti tiap keputusan di `decisions.md`.

## 9. Out of Scope
CRM tiket klaim penuh, SLA otomatis, dashboard analitik lintas wilayah.

## 10. Catatan untuk Agent
- File: `app/admin/shipments/`, `app/api/v1/admin/shipments/`, `components/audit/`, `lib/anomaly.ts`, `lib/integrations/sentry/`.
