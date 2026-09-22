# FRD-03 — Verifikasi PIN per Segmen Layanan

| | |
|---|---|
| **MCP** | Supabase · Resend · Chrome DevTools |
| **Tingkat** | ★★★ |
| **Skill** | `feature-pin-by-segment` |

> FRD ini menjelaskan apa yang harus dibangun. Kondisi khusus yang tidak ditulis di sini, kamu yang putuskan dan catat di `decisions.md`.

## 1. Ringkasan
Pengiriman pada segmen **Instant** dan **Same-day** mewajibkan PIN yang dikirim ke penerima. Kurir memasukkan PIN sebelum pengiriman dapat ditandai selesai. Segmen lain tidak mewajibkan PIN agar tidak menghambat ketika penerima tidak di rumah.

## 2. User Story
> Sebagai pembeli, saya ingin paket hanya diserahkan setelah PIN saya diverifikasi, supaya paket yang dititipkan di pos atau diterima orang lain tetap aman.

## Peran

| Aksi | Kurir | Pembeli | Admin/CS |
|---|---|---|---|
| Menerima PIN | ❌ | ✅ | ❌ |
| Memasukkan PIN di aplikasi | ✅ | ❌ | ❌ |
| Meminta PIN dikirim ulang | ✅ | ✅ | ✅ |
| Membuka blokir PIN | ❌ | ❌ | ✅ |
| Melewati PIN (override) | ❌ | ❌ | ✅ |

## 3. Peran MCP

| MCP | Dipakai agent untuk | Output |
|---|---|---|
| Supabase | Membuat tabel `pin_challenges`, policy akses, dan uji hash PIN. | Migrasi + baris uji |
| Resend | Mengirim email PIN uji ke penerima. | Email PIN |
| Chrome DevTools | Menjalankan alur kirim PIN → masukkan → verifikasi/gagal. | Rekaman alur PIN |

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-03-01 | Saat pengiriman `instant` atau `same_day` dibuat, sistem membuat `pin_challenge` dengan PIN 6 digit acak dan `pin_required = true`. |
| FR-03-02 | PIN dikirim ke kontak penerima saat kurir menandai tiba di lokasi, bukan saat pemesanan. |
| FR-03-03 | PIN disimpan sebagai hash; PIN mentah tidak pernah disimpan atau ditampilkan di log. |
| FR-03-04 | PIN berlaku 15 menit dan dapat dikirim ulang maksimal 3 kali per pengiriman. |
| FR-03-05 | Kurir memasukkan PIN di aplikasi; server memverifikasi hash dan status `expires_at`. |
| FR-03-06 | Maksimal 3 percobaan salah; setelah itu `pin_challenge` berstatus `locked`. |
| FR-03-07 | Pengiriman `instant`/`same_day` tidak dapat ditandai `delivered` tanpa PIN `verified` atau override admin. |
| FR-03-08 | Admin/CS dapat membuka blokir atau melakukan override dengan alasan yang tercatat. |
| FR-03-09 | Pengiriman `regular` tidak membuat `pin_challenge` dan tidak diblokir oleh PIN. |
| FR-03-10 | Setiap percobaan verifikasi (berhasil/gagal) tercatat sebagai `delivery_event`. |

## 5. Business Rules

- Kewajiban PIN ditentukan **hanya** oleh `service_type`, bukan oleh pilihan kurir atau pembeli.
- PIN tidak boleh muncul di respons API setelah dibuat.
- Pesan gagal tidak boleh membocorkan digit PIN yang benar.
- Override admin mencatat identitas admin dan alasan, dan terlihat di audit trail.

## 6. Data Model
Tabel `pin_challenges` mengikuti kamus data di PRD. Rancangan mekanisme pengiriman PIN (kanal, template pesan) dibuat sendiri mengikuti konvensi di PRD.

## 7. Acceptance Criteria

- [ ] **Given** pengiriman `instant`, **When** dibuat, **Then** `pin_challenge` dibuat dengan `pin_required = true`.
- [ ] **Given** pengiriman `regular`, **When** dibuat, **Then** tidak ada `pin_challenge` dan kurir dapat menyelesaikan tanpa PIN.
- [ ] **Given** PIN benar dan belum kedaluwarsa, **When** kurir memasukkan, **Then** status `verified` dan pengiriman dapat diselesaikan.
- [ ] **Given** PIN salah 3 kali, **When** percobaan ketiga diproses, **Then** status `locked` dan penyelesaian diblokir.
- [ ] **Given** PIN kedaluwarsa, **When** kurir memasukkan, **Then** verifikasi gagal dan kurir dapat meminta kirim ulang.
- [ ] **Given** admin melakukan override, **When** pengiriman diselesaikan, **Then** alasan dan identitas admin tercatat.

## 8. Verifikasi via MCP

- [ ] **Supabase:** baris `pin_challenges` untuk skenario sukses, gagal, kedaluwarsa, dan `locked`; pastikan tidak ada PIN mentah tersimpan.
- [ ] **Resend:** email PIN uji yang terkirim ke penerima.
- [ ] **Chrome DevTools:** rekaman alur tiba → kirim PIN → masukkan → verifikasi, termasuk kasus gagal.
- [ ] Bukti tiap keputusan di `decisions.md`.

## 9. Out of Scope
PIN lewat SMS/WhatsApp produksi, PIN berbasis biometrik, PIN yang dipilih sendiri penerima.

## 10. Catatan untuk Agent
- File: `app/courier/pin/`, `app/api/v1/courier/shipments/`, `app/api/v1/admin/pins/`, `components/pin/`, `lib/integrations/resend/`, `lib/pin.ts`.
