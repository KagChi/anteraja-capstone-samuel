# FRD-04 — Matchmaking Lokasi Kurir ↔ Pembeli

| | |
|---|---|
| **MCP** | Supabase (PostGIS) · Google Maps · Chrome DevTools |
| **Tingkat** | ★★ |
| **Skill** | `feature-location-matchmaking` |

> FRD ini menjelaskan apa yang harus dibangun. Kondisi khusus yang tidak ditulis di sini, kamu yang putuskan dan catat di `decisions.md`.

## 1. Ringkasan
Sistem mencocokkan titik lokasi kurir dengan titik lokasi pembeli untuk menentukan titik temu yang jelas. Bila ada selisih antara koordinat tujuan dan posisi pembeli, sistem menampilkan jarak dan selisihnya agar kurir dan pembeli menyepakati titik temu sebelum serah terima.

## 2. User Story
> Sebagai kurir, saya ingin tahu persis di mana pembeli berada relatif terhadap titik tujuan, supaya saya tidak salah antar di area padat atau gedung bertingkat.

## Peran

| Aksi | Kurir | Pembeli | Admin/CS |
|---|---|---|---|
| Melihat posisi tujuan dan posisi pembeli | ✅ | ✅ | ✅ |
| Mengusulkan titik temu | ✅ | ✅ | ✅ |
| Menyetujui titik temu | ✅ | ✅ | ✅ |
| Mencatat titik temu final | ✅ | ❌ | ✅ |
| Menyesuaikan titik tujuan master | ❌ | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| Supabase (PostGIS) | Menghitung jarak antar titik dan mencari titik tujuan terdekat. | Hasil query jarak |
| Google Maps | Menampilkan peta titik kurir, titik tujuan, dan titik usulan. | Tangkapan peta + rute |
| Chrome DevTools | Menjalankan alur usul → setuju → catat titik temu dari dua sesi. | Rekaman dua sesi |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-04-01 | Sistem menampilkan posisi kurir, posisi tujuan, dan (bila tersedia) posisi pembeli di satu peta. |
| FR-04-02 | Sistem menghitung dan menampilkan jarak kurir→tujuan dan tujuan→pembeli dalam meter. |
| FR-04-03 | Bila jarak tujuan→pembeli melebihi ambang (default 50 m), sistem menandai "perlu titik temu". |
| FR-04-04 | Kurir atau pembeli dapat mengusulkan titik temu berupa koordinat atau penanda peta. |
| FR-04-05 | Usulan titik temu dikirim ke pihak lain untuk disetujui; status usulan terlihat oleh kedua pihak. |
| FR-04-06 | Setelah disetujui, titik temu final dicatat sebagai `delivery_event` bertipe titik temu. |
| FR-04-07 | Geofence penyelesaian (FRD-01) memakai titik temu final sebagai pusat bila titik temu disetujui. |
| FR-04-08 | Bila pihak lain tidak merespons dalam batas waktu, usulan kedaluwarsa dan dapat diajukan ulang. |
| FR-04-09 | Admin/CS dapat menetapkan titik temu secara sepihak bila kedua pihak tidak sepakat. |
| FR-04-10 | Semua usulan dan persetujuan tercatat dengan aktor dan waktu. |

## 5. Business Rules

- Titik temu final hanya boleh ada satu per pengiriman.
- Persetujuan harus dari pihak yang bukan pengusul.
- Titik temu tidak mengubah alamat master pengiriman; ia hanya memengaruhi pusat geofence.
- Perhitungan jarak dan pencocokan selalu di server.

## 6. Data Model
Memakai `delivery_events` (tipe event titik temu) dan `shipments`. Rancangan tabel `meeting_points` beserta status usulan dibuat sendiri mengikuti konvensi di PRD.

## 7. Acceptance Criteria

- [ ] **Given** jarak tujuan→pembeli 120 m, **When** halaman dibuka, **Then** sistem menandai "perlu titik temu".
- [ ] **Given** kurir mengusulkan titik temu, **When** pembeli menyetujui, **Then** titik temu final tercatat dan terlihat kedua pihak.
- [ ] **Given** titik temu disetujui, **When** kurir menekan "Selesai", **Then** geofence memakai titik temu sebagai pusat.
- [ ] **Given** usulan tidak direspons sampai batas waktu, **When** waktu lewat, **Then** usulan berstatus kedaluwarsa.
- [ ] **Given** kedua pihak tidak sepakat, **When** admin menetapkan titik temu, **Then** titik temu final tercatat atas nama admin.

## 8. Verifikasi via MCP

- [ ] **Supabase (PostGIS):** hasil query jarak kurir→tujuan dan tujuan→pembeli.
- [ ] **Supabase (PostGIS):** baris `delivery_events` untuk usulan, persetujuan, dan titik temu final.
- [ ] **Google Maps:** tangkapan peta dengan tiga titik dan rute.
- [ ] **Chrome DevTools:** rekaman sesi kurir dan sesi pembeli dari usul sampai catat titik temu.
- [ ] Bukti tiap keputusan di `decisions.md`.

## 9. Out of Scope
Chat dalam aplikasi, penjadwalan titik temu, optimasi rute multi-titik.

## 10. Catatan untuk Agent
- File: `app/courier/meeting-points/`, `app/api/v1/courier/meeting-points/`, `components/matchmaking/`, `lib/geo/matchmaking.ts`.
