# Day 19 — Peta Lokasi Pengiriman (Google Maps)

Halaman statis `shipment-map.html` yang memplot lokasi shipment dan kurir di
area layanan Jakarta memakai Google Maps JavaScript API. Marker diambil dari
data contoh 15 pengiriman, info window menampilkan tracking number dan status
saat marker diklik, dan satu data yang hanya berisi alamat di-geocode menjadi
marker (bonus).

## Prasyarat: Google Maps API key yang dibatasi

Repo ini sengaja hanya menyimpan placeholder `YOUR_API_KEY` di
`shipment-map.html`. Jangan pernah meng-commit key tanpa pembatasan.

1. Buka **Google Cloud Console** > **APIs & Services** > **Credentials**, lalu
   buat **API key**.
2. Aktifkan **Maps JavaScript API** (dan, jika ingin, **Geocoding API**) pada
   project yang sama.
3. Batasi key sebelum dipakai:
   - **Application restriction**: HTTP referrers, tambahkan
     `http://localhost/*`, `http://localhost:*/*`, `http://127.0.0.1/*`,
     dan `http://127.0.0.1:*/*`.
   - **API restriction**: batasi ke **Maps JavaScript API**.
4. Salin key hasilnya ke dalam `shipment-map.html`, ganti baris:

   ```js
   const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY";
   ```

   Key ini boleh ikut ter-commit **hanya** karena sudah dibatasi ke domain
   lokal. Key tanpa restriction adalah kesalahan paling umum dan berisiko.

## Cara menjalankan

Buka langsung dari filesystem:

```bash
open docs/geolocation-map/shipment-map.html
```

Atau lewat server statis lokal (lebih dekat dengan kondisi deployment, dan
membuat referrer `http://localhost:8000/*` cocok dengan restriction):

```bash
python3 -m http.server 8000 --directory docs/geolocation-map
# lalu buka http://localhost:8000/shipment-map.html
```

## Yang ditampilkan

- Peta terpusat ke Jakarta (`-6.229, 106.854`) dengan zoom awal 12.
- 15 pengiriman dari `docs/data/shipments-couriers-coordinates.csv`:
  marker **shipment** (magenta) di titik tujuan dan marker **kurir** (biru) di
  posisi kurir terakhir.
- Info window pada setiap marker: tracking number, status, dan peran marker.
- **Bonus**: alamat pada `addressOnlyRecords` (tanpa lat/lng) di-geocode lewat
  `google.maps.Geocoder` dan muncul sebagai marker ungu.

Peta memanggil `fitBounds` sehingga seluruh marker langsung terlihat. Kalau
key ditolak atau jaringan gagal, banner status di atas peta menjelaskan
penyebabnya.

## Catatan verifikasi

Rendering peta butuh jaringan keluar dan API key yang valid, jadi verifikasi
visual dijalankan setelah key dimasukkan. Bila jaringan tidak tersedia,
laporkan sebagai belum terverifikasi alih-alih menganggapnya lolos.

Checklist:

- Jumlah marker sesuai data (15 shipment + 15 kurir + 1 hasil geocoding).
- Klik marker shipment dan kurir: info window menampilkan tracking number dan
  status yang benar.
- Marker hasil geocoding muncul untuk alamat tanpa lat/lng.
- Alamat sengaja dibuat salah: marker lain tetap tampil dan hanya muncul
  `console.warn`.
- `git grep YOUR_API_KEY` hanya menemukan placeholder, bukan key asli.
