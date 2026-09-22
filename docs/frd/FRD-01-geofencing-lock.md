# FRD-01 — Geofencing Lock Penyelesaian Pesanan

| | |
|---|---|
| **MCP** | Supabase (PostGIS) · Google Maps · Chrome DevTools |
| **Tingkat** | ★★★ |
| **Skill** | `feature-geofencing-lock` |

> FRD ini menjelaskan apa yang harus dibangun. Kondisi khusus yang tidak ditulis di sini, kamu yang putuskan dan catat di `decisions.md`.

## 1. Ringkasan
Tombol "Selesai" pada aplikasi kurir hanya aktif bila posisi GPS kurir berada di dalam radius geofence titik tujuan. Bila di luar radius, tombol terkunci dan sistem menawarkan jalur alternatif yang tetap tercatat.

## 2. User Story
> Sebagai Admin operasional, saya ingin kurir tidak bisa menandai paket "Diterima" dari lokasi jauh, supaya pengiriman palsu dan salah antar dapat dicegah.

## Peran

| Aksi | Kurir | Admin/CS |
|---|---|---|
| Mengirim posisi GPS saat menekan "Selesai" | ✅ | ❌ |
| Menyelesaikan pesanan di dalam geofence | ✅ | ❌ |
| Menyelesaikan pesanan dengan pengecualian | ❌ | ✅ |
| Menyesuaikan radius geofence | ❌ | ✅ |
| Melihat riwayat pelanggaran geofence | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| Supabase (PostGIS) | Membuat kolom `geography`, index GiST, fungsi evaluasi radius, dan uji query jarak. | Migrasi + hasil query jarak |
| Google Maps | Mengubah alamat tujuan menjadi koordinat yang dipakai sebagai pusat geofence. | Titik tujuan ter-geocode |
| Chrome DevTools | Menjalankan aplikasi dengan posisi GPS di dalam dan di luar radius. | Rekaman dua skenario |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01-01 | Sistem membuat `geofence` untuk setiap pengiriman dari koordinat tujuan yang sudah ter-geocode. |
| FR-01-02 | Radius geofence mengikuti `service_type`: `instant` 30 m, `same_day` 50 m, `regular` 100 m, kecuali ditimpa admin. |
| FR-01-03 | Aplikasi kurir mengirim koordinat saat ini ke `/api/v1/courier/shipments/:id/location` ketika kurir menekan "Selesai". |
| FR-01-04 | Server menghitung jarak kurir ke pusat geofence dan menyimpan `delivery_event` berisi jarak tersebut. |
| FR-01-05 | Tombol "Selesai" aktif hanya bila jarak ≤ radius. Bila di luar radius, tombol terkunci dan alasannya ditampilkan. |
| FR-01-06 | Kurir dapat mengajukan penyelesaian di luar radius sebagai **pengecualian** yang wajib disetujui Admin/CS. |
| FR-01-07 | Admin/CS dapat menyetujui atau menolak pengecualian, dengan alasan tercatat. |
| FR-01-08 | Setiap percobaan menyelesaikan di luar radius tercatat di `delivery_events` walaupun gagal. |
| FR-01-09 | Koordinat dari klien divalidasi ulang di server; koordinat tidak valid atau kosong menolak aksi. |
| FR-01-10 | Pengiriman ditandai `delivered` hanya setelah verifikasi geofence lulus atau pengecualian disetujui. |

## 5. Business Rules

- Radius adalah kebijakan per `service_type` dan hanya bisa diubah Admin/CS.
- Keputusan lulus/tidak lulus **selalu** dihitung di server, bukan di perangkat.
- Pengecualian di luar radius tidak mengubah status langsung; status berubah hanya setelah persetujuan admin.
- Satu pengiriman hanya boleh punya satu `geofence` aktif.

## 6. Data Model
Tabel `geofences`, `delivery_events`, dan `shipments` mengikuti kamus data di PRD. Rancangan tambahan (mis. tabel `delivery_exceptions`) dibuat sendiri mengikuti konvensi di PRD.

## 7. Acceptance Criteria

- [ ] **Given** kurir berada 10 m dari tujuan `instant`, **When** menekan "Selesai", **Then** tombol aktif dan status menjadi `delivered`.
- [ ] **Given** kurir berada 800 m dari tujuan, **When** menekan "Selesai", **Then** tombol terkunci, alasan ditampilkan, dan percobaan tercatat.
- [ ] **Given** posisi kosong atau `latitude/longitude` di luar rentang, **When** memanggil endpoint, **Then** server menolak dengan pesan validasi.
- [ ] **Given** pengecualian diajukan, **When** admin menolak, **Then** status pengiriman tidak berubah.
- [ ] **Given** radius diubah admin, **When** kurir menekan "Selesai" pada jarak yang kini valid, **Then** keputusan mengikuti radius baru.

## 8. Verifikasi via MCP

- [ ] **Supabase (PostGIS):** hasil query `ST_Distance` untuk beberapa koordinat uji terhadap radius.
- [ ] **Supabase (PostGIS):** isi `delivery_events` setelah percobaan lulus dan gagal.
- [ ] **Google Maps:** titik tujuan hasil geocoding yang dipakai sebagai pusat geofence.
- [ ] **Chrome DevTools:** rekaman skenario dalam radius dan di luar radius.
- [ ] Bukti tiap keputusan di `decisions.md`.

## 9. Out of Scope
Pelacakan GPS berkelanjutan, peta real-time untuk pembeli, deteksi spoofing GPS tingkat lanjut.

## 10. Catatan untuk Agent
- File: `app/courier/`, `app/api/v1/courier/shipments/`, `components/geofence/`, `lib/geo/distance.ts`, `lib/geo/geofence.ts`.
