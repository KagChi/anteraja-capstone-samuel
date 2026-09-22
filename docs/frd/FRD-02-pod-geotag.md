# FRD-02 — Geotagged & Watermarked Proof of Delivery

| | |
|---|---|
| **MCP** | Supabase (PostGIS, Storage) · Google Maps · Chrome DevTools |
| **Tingkat** | ★★ |
| **Skill** | `feature-pod-geotag` |

> FRD ini menjelaskan apa yang harus dibangun. Kondisi khusus yang tidak ditulis di sini, kamu yang putuskan dan catat di `decisions.md`.

## 1. Ringkasan
Foto bukti pengiriman (Proof of Delivery) diambil lewat kamera dalam aplikasi dan otomatis disematkan watermark berisi koordinat, alamat, nama penerima, tanggal, dan timestamp. Metadata ini tidak dapat direkayasa dari sisi klien dan tersimpan bersama foto di Storage.

## 2. User Story
> Sebagai tim Customer Service, saya ingin setiap foto bukti berisi koordinat dan waktu yang sah, supaya investigasi klaim pelanggan punya dasar objektif dan cepat.

## Peran

| Aksi | Kurir | Admin/CS |
|---|---|---|
| Mengambil foto POD lewat kamera aplikasi | ✅ | ❌ |
| Mengunggah foto dari galeri sebagai POD | ❌ | ❌ |
| Melihat POD beserta metadata | ❌ | ✅ |
| Menandai POD tidak valid | ❌ | ✅ |
| Mengekspor riwayat POD untuk audit | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| Supabase (Storage) | Membuat bucket privat, policy akses, dan mengunggah foto uji. | Objek foto + URL bertanda tangan |
| Supabase (PostGIS) | Menyimpan titik POD dan menghitung jarak ke tujuan. | Baris `delivery_proofs` + jarak |
| Google Maps | Menghasilkan alamat dari koordinat POD (reverse geocoding) untuk watermark. | Alamat pada watermark |
| Chrome DevTools | Menjalankan pengambilan foto dan memeriksa hasil watermark. | Rekaman + tangkapan foto |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-02-01 | Aplikasi kurir hanya menyediakan jalur pengambilan foto dari kamera dalam aplikasi; unggah dari galeri diblokir. |
| FR-02-02 | Saat foto diambil, aplikasi mengirim koordinat, `device_captured_at`, nama penerima, dan foto ke server. |
| FR-02-03 | Server menghitung `distance_to_destination_m` dan menyimpan `delivery_proofs`. |
| FR-02-04 | Watermark memuat: koordinat, alamat hasil reverse geocoding, nama penerima, `captured_at` (waktu server), dan nomor tracking. |
| FR-02-05 | Watermark dibentuk dengan data server, bukan data yang dikirim klien apa adanya. |
| FR-02-06 | Foto disimpan di bucket privat; akses hanya lewat URL bertanda tangan berumur pendek. |
| FR-02-07 | Server menyimpan `watermark_hash` untuk mendeteksi perubahan isi watermark. |
| FR-02-08 | Bila selisih `captured_at` server dan `device_captured_at` melebihi ambang, POD ditandai perlu tinjauan. |
| FR-02-09 | Admin/CS dapat menandai POD tidak valid beserta alasan. |
| FR-02-10 | POD wajib ada sebelum pengiriman dapat ditandai `delivered`. |

## 5. Business Rules

- Foto tanpa koordinat atau dengan koordinat tidak valid ditolak.
- Watermark tidak boleh dapat dihapus atau diubah setelah tersimpan.
- `captured_at` memakai jam server sebagai sumber kebenaran; `device_captured_at` hanya indikator anomali.
- Satu pengiriman boleh punya lebih dari satu percobaan POD, tetapi hanya satu yang ditandai valid.

## 6. Data Model
Tabel `delivery_proofs` mengikuti kamus data di PRD. Rancangan kolom tambahan untuk status tinjauan dibuat sendiri mengikuti konvensi di PRD.

## 7. Acceptance Criteria

- [ ] **Given** kurir mengambil foto dalam aplikasi, **When** foto terkirim, **Then** POD tersimpan dengan koordinat, jarak, dan watermark berisi semua elemen.
- [ ] **Given** kurir mencoba memilih foto dari galeri, **When** menekan tombol unggah, **Then** jalur ini tidak tersedia.
- [ ] **Given** foto dikirim tanpa koordinat, **When** server menerima, **Then** pengiriman ditolak dengan pesan validasi.
- [ ] **Given** `device_captured_at` jauh berbeda dari `captured_at`, **When** POD disimpan, **Then** POD ditandai perlu tinjauan.
- [ ] **Given** pengiriman belum punya POD, **When** kurir menekan "Selesai", **Then** aksi ditolak.

## 8. Verifikasi via MCP

- [ ] **Supabase (Storage):** objek foto uji dan URL bertanda tangan yang bekerja lalu kedaluwarsa.
- [ ] **Supabase (PostGIS):** baris `delivery_proofs` dengan koordinat dan jarak.
- [ ] **Google Maps:** hasil reverse geocoding yang tampil di watermark.
- [ ] **Chrome DevTools:** tangkapan foto beserta watermark dan percobaan galeri yang diblokir.
- [ ] Bukti tiap keputusan di `decisions.md`.

## 9. Out of Scope
Pengenalan wajah penerima, tanda tangan digital, verifikasi keaslian foto tingkat forensik.

## 10. Catatan untuk Agent
- File: `app/courier/pod/`, `app/api/v1/courier/shipments/`, `components/pod/`, `lib/integrations/storage/`, `lib/geo/reverse.ts`.
