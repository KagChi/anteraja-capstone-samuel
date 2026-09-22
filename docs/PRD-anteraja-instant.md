# PRD — Anteraja Instant Delivery Integrity

> Dokumen ini berlaku untuk **semua** fitur. Ubah jadi **Rules** (scope Workspace) sebelum agent mulai bekerja.

## 1. Produk

Modul verifikasi pengiriman *last-mile* untuk layanan **Anteraja Instant** dan **Same-day**. Modul ini membantu operasional memastikan paket benar-benar sampai ke tangan penerima yang benar, di lokasi yang benar, dengan bukti yang tidak dapat direkayasa.

Fokus MVP adalah integritas pengiriman, bukan pemetaan rute penuh. Posisi GPS kurir dibaca **saat aksi kunci terjadi** (misalnya menekan "Selesai"), bukan sebagai pelacakan *live* berkelanjutan.

**Sudah ada di repo:** halaman HTML statis Anteraja (di branch `feat/quiz`, bukan bagian modul ini), struktur `src/` dan `docs/`.

## 2. Prinsip Produk

- Bukti pengiriman harus **objektif dan tidak dapat direkayasa**: koordinat, waktu, dan foto berasal dari sumber tepercaya.
- Posisi **tidak boleh** dipercaya dari klien tanpa validasi server.
- Setiap keputusan verifikasi harus dapat diaudit: siapa, kapan, di mana, dan dengan aturan apa.
- Kegagalan verifikasi harus **menutup** aksi penipuan, bukan sekadar memberi peringatan.

## 3. Stack

- Next.js (App Router) + TypeScript strict. Versi mengikuti `package.json`.
- Tailwind CSS + shadcn/ui.
- Supabase: Postgres + **PostGIS**, Auth, Storage, Edge Functions.
- Google Maps Platform: Geocoding, Distance Matrix, Maps JavaScript SDK.
- Zod untuk validasi input.
- Vitest (unit) dan Playwright (e2e).

## 4. Struktur Folder

```
app/                    # halaman
app/api/v1/<resource>/  # route handler API
components/<fitur>/     # komponen per fitur
lib/                    # helper bersama
lib/geo/                # helper geospasial (haversine, geofence, geohash)
lib/integrations/<name>/# klien layanan pihak ketiga
supabase/migrations/    # migrasi SQL
supabase/functions/     # edge functions
docs/                   # dokumen (PRD, FRD, data contoh)
```

Fitur baru tidak mengubah file milik fitur lain. Helper baru dibuat sebagai file baru di `lib/`.

## 5. Identitas Pengguna

- Aktor modul ini adalah **Kurir (SATRIA)** dan **Admin/CS**, bukan pengguna publik.
- Kurir aktif diambil **hanya** lewat `getCurrentCourier()` di `lib/auth.ts`. Return: `{ id, name, serviceAreaId, phone } | null`.
- Admin/CS diambil lewat `getCurrentAdmin()` di `lib/auth.ts`. Return: `{ id, name, role } | null`.
- Endpoint kurir dan endpoint admin dipisah dan masing-masing memverifikasi perannya.

## 6. Kamus Data (inti)

### `couriers`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| name | text | |
| phone | text | unik |
| service_area_id | uuid | FK service_areas |
| is_active | boolean | default true |
| created_at | timestamptz | |

### `shipments`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| tracking_number | text | unik |
| service_type | text | `instant` / `same_day` / `regular` |
| courier_id | uuid | FK couriers, nullable sebelum pickup |
| origin | geography(Point,4326) | titik asal |
| destination | geography(Point,4326) | titik tujuan |
| destination_address | text | alamat tujuan |
| status | text | `pending` / `picked_up` / `in_transit` / `delivered` / `failed` |
| pin_required | boolean | ditentukan dari `service_type` |
| delivered_at | timestamptz | |
| created_at, updated_at | timestamptz | |

### `delivery_events`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| shipment_id | uuid | FK shipments |
| courier_id | uuid | FK couriers |
| event_type | text | `pickup` / `arrived` / `delivery_attempt` / `delivered` / `failed` |
| point | geography(Point,4326) | posisi saat event dibuat |
| distance_to_destination_m | integer | dihitung server |
| created_at | timestamptz | |

### `delivery_proofs`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| shipment_id | uuid | FK shipments |
| courier_id | uuid | FK couriers |
| photo_path | text | path di Supabase Storage |
| point | geography(Point,4326) | koordinat saat foto |
| distance_to_destination_m | integer | |
| captured_at | timestamptz | timestamp server |
| device_captured_at | timestamptz | timestamp klien, untuk deteksi anomali |
| watermark_hash | text | hash konten watermark |
| recipient_name | text | |
| created_at | timestamptz | |

### `pin_challenges`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| shipment_id | uuid | FK shipments |
| code_hash | text | hash PIN, bukan PIN mentah |
| attempts | integer | default 0 |
| max_attempts | integer | default 3 |
| status | text | `pending` / `verified` / `locked` / `expired` |
| expires_at | timestamptz | |
| verified_at | timestamptz | |
| created_at | timestamptz | |

### `geofences`
| Field | Tipe | Catatan |
|---|---|---|
| id | uuid | PK |
| shipment_id | uuid | FK shipments |
| center | geography(Point,4326) | titik tujuan terverifikasi |
| radius_m | integer | default mengikuti `service_type` |
| created_at | timestamptz | |

Jenis layanan menentukan kebijakan PIN dan radius geofence. Lihat `docs/frd/` untuk aturan per fitur.

## 7. Koordinat & Waktu

- Koordinat disimpan sebagai `geography(Point,4326)` (WGS84), bukan dua kolom float terpisah.
- Jarak dihitung dengan `ST_Distance` di Postgres atau helper `haversineMeters()` di `lib/geo/distance.ts` untuk perhitungan di aplikasi.
- Semua jarak dalam **meter** (integer).
- Zona waktu aplikasi: **Asia/Jakarta**. Waktu disimpan `timestamptz` (UTC). Helper di `lib/date.ts`.
- Posisi klien **selalu** divalidasi ulang di server sebelum dipakai untuk keputusan verifikasi.

## 8. Kontrak API

- Prefix `/api/v1/`.
- Sukses: `{ "success": true, "data": ..., "error": null }`
- Gagal: `{ "success": false, "data": null, "error": { "code": "KODE", "message": "pesan untuk user" } }`
- Endpoint kurir di `/api/v1/courier/...`, endpoint admin di `/api/v1/admin/...`.

## 9. Database

- Satu perubahan skema = satu file migrasi di `supabase/migrations/`.
- Tabel baru: `id uuid`, `created_at`, `updated_at` bila relevan.
- Data milik kurir dilindungi RLS: kurir hanya membaca pengiriman yang ditugaskan kepadanya.
- Query spasial memakai index GiST pada kolom `geography`.

## 10. Integrasi Pihak Ketiga

- Klien integrasi di `lib/integrations/<name>/`, tidak dipanggil langsung dari komponen.
- Google Maps Platform dipakai untuk geocoding alamat penerima dan verifikasi titik tujuan.
- Secret hanya di environment variable server. Jangan pernah membaca, menampilkan, atau mengubah `.env*`.

## 11. UI

- Bahasa Indonesia.
- Komponen dasar dari shadcn/ui.
- Aplikasi kurir dirancang untuk layar kecil dan dipakai satu tangan; alur kritis maksimal tiga ketukan.

## 12. Keamanan Kerja Agent

- Tidak membaca, menampilkan, atau mengubah `.env*`.
- Tidak menjalankan `supabase db reset`, `DROP`, `TRUNCATE`, atau hapus data massal tanpa izin eksplisit.
- Tidak menjalankan operasi di mode live/production layanan pihak ketiga.
- Tidak melonggarkan aturan geofence, PIN, atau validasi server demi kelulusan uji.
