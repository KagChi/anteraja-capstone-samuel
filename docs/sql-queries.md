# Day 14 - Analisis Data Pengiriman (SQL Murni)

Dokumen ini berisi rangkaian query SQL murni (tanpa Eloquent) terhadap tabel
`shipments` dan `couriers` dari Hari 3, beserta hasil aslinya saat dijalankan.

- **Branch:** `feature/sql-analysis`
- **Database:** PostgreSQL skema Anteraja, 1000 shipment dan 17 courier
- **Kolom berat:** `shipments.weight_kg` (kg)
- **Berkas query:** [`docs/sql-queries.sql`](./sql-queries.sql)

Setiap query dijalankan langsung ke database dan hasilnya ditempel apa adanya di bawah ini.

## 1. Query Dasar

### 1.1 Shipment in_transit diurutkan dari yang terberat

Menyaring shipment berstatus in_transit memakai WHERE, lalu mengurutkannya dari berat terberat dengan ORDER BY weight_kg DESC.

```sql
SELECT s.tracking_number,
       c.code AS courier,
       s.service_type,
       s.weight_kg,
       s.status
FROM shipments s
LEFT JOIN couriers c ON c.id = s.courier_id
WHERE s.status = 'in_transit'
ORDER BY s.weight_kg DESC, s.tracking_number
LIMIT 10;
```

10 baris terberat dari 248 shipment berstatus in_transit:

| tracking_number | courier | service_type | weight_kg | status |
| --- | --- | --- | --- | --- |
| AJ2509000017 | STR-001 | regular | 29.97 | in_transit |
| AJ2509000261 | STR-005 | instant | 29.90 | in_transit |
| AJ2509000829 | STR-013 | same_day | 29.84 | in_transit |
| AJ2509000325 | STR-005 | same_day | 29.77 | in_transit |
| AJ2509000209 | STR-001 | regular | 29.59 | in_transit |
| AJ2509000733 | STR-013 | same_day | 29.53 | in_transit |
| AJ2509000249 | STR-009 | instant | 29.42 | in_transit |
| AJ2509000529 | STR-001 | same_day | 29.40 | in_transit |
| AJ2509000233 | STR-009 | regular | 29.37 | in_transit |
| AJ2509000753 | STR-001 | instant | 29.22 | in_transit |

### 1.2 Kategori berat Small / Medium / Large dengan CASE

Klausa CASE membagi shipment ke tiga kategori berat: Small di bawah 5 kg, Medium 5 sampai 20 kg, dan Large di atas 20 kg.

```sql
SELECT s.tracking_number,
       s.weight_kg,
       CASE
           WHEN s.weight_kg < 5 THEN 'Small'
           WHEN s.weight_kg <= 20 THEN 'Medium'
           ELSE 'Large'
       END AS kategori
FROM shipments s
ORDER BY s.weight_kg DESC
LIMIT 15;
```

| tracking_number | weight_kg | kategori |
| --- | --- | --- |
| AJ2509000017 | 29.97 | Large |
| AJ2509000767 | 29.93 | Large |
| AJ2509000261 | 29.90 | Large |
| AJ2509000892 | 29.88 | Large |
| AJ2509000829 | 29.84 | Large |
| AJ2509000679 | 29.77 | Large |
| AJ2509000325 | 29.77 | Large |
| AJ2509000927 | 29.76 | Large |
| AJ2509000722 | 29.66 | Large |
| AJ2509000209 | 29.59 | Large |
| AJ2509000733 | 29.53 | Large |
| AJ2509000120 | 29.51 | Large |
| AJ2509000966 | 29.51 | Large |
| AJ2509000249 | 29.42 | Large |
| AJ2509000529 | 29.40 | Large |

### 1.3 Rekap jumlah shipment per kategori berat

Versi agregat dari CASE di atas: kategori yang sama dikelompokkan dengan GROUP BY untuk menghitung jumlah dan rata-rata beratnya.

```sql
SELECT CASE
           WHEN s.weight_kg < 5 THEN 'Small'
           WHEN s.weight_kg <= 20 THEN 'Medium'
           ELSE 'Large'
       END AS kategori,
       count(*) AS jumlah,
       round(avg(s.weight_kg), 2) AS rata_berat_kg
FROM shipments s
GROUP BY 1
ORDER BY 1;
```

| kategori | jumlah | rata_berat_kg |
| --- | --- | --- |
| Large | 329 | 24.97 |
| Medium | 540 | 12.03 |
| Small | 131 | 2.77 |

## 2. Agregasi & Join

### 2.1 Total shipment per courier bulan ini

JOIN shipments ke couriers, disaring ke satu bulan berjalan, lalu GROUP BY courier untuk menghitung jumlah shipment per kurir.

```sql
WITH periode AS (
    SELECT date_trunc('month', max(created_at)) AS bulan
    FROM shipments
)
SELECT c.code AS courier,
       c.name,
       count(s.id) AS total_shipment
FROM couriers c
JOIN shipments s ON s.courier_id = c.id
CROSS JOIN periode p
WHERE s.created_at >= p.bulan
  AND s.created_at < p.bulan + interval '1 month'
GROUP BY c.code, c.name
ORDER BY total_shipment DESC, c.code;
```

| courier | name | total_shipment |
| --- | --- | --- |
| STR-001 | Budi Pratama | 65 |
| STR-002 | Andi Saputra | 63 |
| STR-003 | Joko Susilo | 63 |
| STR-004 | Dedi Mulyadi | 63 |
| STR-005 | Eko Prasetyo | 63 |
| STR-006 | Fajar Ramadhan | 63 |
| STR-007 | Gunawan Setiadi | 63 |
| STR-008 | Hariyanto | 63 |
| STR-009 | Irfan Maulana | 62 |
| STR-010 | Kurniawan | 62 |
| STR-013 | Nanang Suryana | 62 |
| STR-014 | Oki Setiana | 62 |
| STR-015 | Pandu Wibowo | 62 |
| STR-016 | Qori Ramadhan | 62 |
| STR-011 | Lukman Hakim | 61 |
| STR-012 | Maulana Yusuf | 61 |

### 2.2 Rata-rata berat shipment per status

GROUP BY status dengan fungsi agregat count, avg, min, dan max untuk melihat sebaran berat tiap status.

```sql
SELECT s.status,
       count(*) AS jumlah,
       round(avg(s.weight_kg), 2) AS rata_berat_kg,
       min(s.weight_kg) AS min_kg,
       max(s.weight_kg) AS max_kg
FROM shipments s
GROUP BY s.status
ORDER BY s.status;
```

| status | jumlah | rata_berat_kg | min_kg | max_kg |
| --- | --- | --- | --- | --- |
| delivered | 256 | 14.65 | 0.64 | 29.88 |
| failed | 248 | 15.51 | 0.50 | 29.93 |
| in_transit | 248 | 15.48 | 0.61 | 29.97 |
| pending | 248 | 14.68 | 0.50 | 29.66 |

### 2.3 Courier dengan lebih dari 62 shipment (HAVING)

HAVING menyaring hasil agregasi: hanya courier dengan jumlah shipment di atas 62 yang ditampilkan.

```sql
SELECT c.code AS courier,
       c.name,
       count(s.id) AS total_shipment
FROM couriers c
JOIN shipments s ON s.courier_id = c.id
GROUP BY c.code, c.name
HAVING count(s.id) > 62
ORDER BY total_shipment DESC, c.code;
```

| courier | name | total_shipment |
| --- | --- | --- |
| STR-001 | Budi Pratama | 65 |
| STR-002 | Andi Saputra | 63 |
| STR-003 | Joko Susilo | 63 |
| STR-004 | Dedi Mulyadi | 63 |
| STR-005 | Eko Prasetyo | 63 |
| STR-006 | Fajar Ramadhan | 63 |
| STR-007 | Gunawan Setiadi | 63 |
| STR-008 | Hariyanto | 63 |

### 2.4 Seluruh courier, termasuk yang belum punya shipment (LEFT JOIN)

LEFT JOIN menjaga semua baris couriers tetap muncul, sehingga courier tanpa shipment tampil dengan hitungan 0 berkat coalesce.

```sql
SELECT c.code AS courier,
       c.name,
       count(s.id) AS total_shipment,
       coalesce(sum(s.weight_kg), 0) AS total_berat_kg
FROM couriers c
LEFT JOIN shipments s ON s.courier_id = c.id
GROUP BY c.code, c.name
ORDER BY total_shipment ASC, c.code;
```

| courier | name | total_shipment | total_berat_kg |
| --- | --- | --- | --- |
| STR-017 | Rizal Fadillah | 0 | 0 |
| STR-011 | Lukman Hakim | 61 | 809.55 |
| STR-012 | Maulana Yusuf | 61 | 771.83 |
| STR-009 | Irfan Maulana | 62 | 922.12 |
| STR-010 | Kurniawan | 62 | 818.70 |
| STR-013 | Nanang Suryana | 62 | 988.14 |
| STR-014 | Oki Setiana | 62 | 921.00 |
| STR-015 | Pandu Wibowo | 62 | 1118.05 |
| STR-016 | Qori Ramadhan | 62 | 914.09 |
| STR-002 | Andi Saputra | 63 | 964.11 |
| STR-003 | Joko Susilo | 63 | 1039.85 |
| STR-004 | Dedi Mulyadi | 63 | 959.03 |
| STR-005 | Eko Prasetyo | 63 | 1035.75 |
| STR-006 | Fajar Ramadhan | 63 | 981.79 |
| STR-007 | Gunawan Setiadi | 63 | 907.16 |
| STR-008 | Hariyanto | 63 | 946.28 |
| STR-001 | Budi Pratama | 65 | 978.25 |

## 3. Padanan Eloquent (`toSql()`)

Query manual di atas bisa juga ditulis lewat query builder Eloquent. Bagian ini menampilkan rantai pemanggilan Eloquent dan SQL yang benar-benar dihasilkan `toSql()` dari aplikasi Laravel pada branch ini, supaya perbedaannya terlihat secara konkret.

### 1.1 Query dasar (WHERE + ORDER BY)

```php
Shipment::query()
    ->where('status', 'in_transit')
    ->orderByDesc('weight_kg')
    ->orderBy('tracking_number')
    ->limit(10);
```

`toSql()`:

```sql
select * from "shipments" where "status" = ? order by "weight_kg" desc, "tracking_number" asc limit 10
```

bindings: `["in_transit"]`

### 1.2 CASE kategori berat

```php
Shipment::query()
    ->select(['tracking_number', 'weight_kg'])
    ->selectRaw("CASE WHEN weight_kg < 5 THEN 'Small' WHEN weight_kg <= 20 THEN 'Medium' ELSE 'Large' END AS kategori")
    ->orderByDesc('weight_kg')
    ->limit(15);
```

`toSql()`:

```sql
select "tracking_number", "weight_kg", CASE WHEN weight_kg < 5 THEN 'Small' WHEN weight_kg <= 20 THEN 'Medium' ELSE 'Large' END AS kategori from "shipments" order by "weight_kg" desc limit 15
```

bindings: `[]`

### 1.3 Rekap kategori (GROUP BY)

```php
Shipment::query()
    ->selectRaw("CASE WHEN weight_kg < 5 THEN 'Small' WHEN weight_kg <= 20 THEN 'Medium' ELSE 'Large' END AS kategori")
    ->selectRaw('count(*) AS jumlah')
    ->selectRaw('round(avg(weight_kg), 2) AS rata_berat_kg')
    ->groupBy('kategori')
    ->orderBy('kategori');
```

`toSql()`:

```sql
select CASE WHEN weight_kg < 5 THEN 'Small' WHEN weight_kg <= 20 THEN 'Medium' ELSE 'Large' END AS kategori, count(*) AS jumlah, round(avg(weight_kg), 2) AS rata_berat_kg from "shipments" group by "kategori" order by "kategori" asc
```

bindings: `[]`

### 2.1 Total shipment per courier

```php
Courier::query()
    ->join('shipments', 'shipments.courier_id', '=', 'couriers.id')
    ->whereBetween('shipments.created_at', [$awalBulan, $akhirBulan])
    ->selectRaw('couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment')
    ->groupBy('couriers.code', 'couriers.name')
    ->orderByDesc('total_shipment')
    ->orderBy('couriers.code');
```

`toSql()`:

```sql
select couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment from "couriers" inner join "shipments" on "shipments"."courier_id" = "couriers"."id" where "shipments"."created_at" between ? and ? group by "couriers"."code", "couriers"."name" order by "total_shipment" desc, "couriers"."code" asc
```

bindings: `["2026-09-01","2026-10-01"]`

### 2.2 Rata-rata berat per status

```php
Shipment::query()
    ->selectRaw('status, count(*) AS jumlah')
    ->selectRaw('round(avg(weight_kg), 2) AS rata_berat_kg')
    ->selectRaw('min(weight_kg) AS min_kg')
    ->selectRaw('max(weight_kg) AS max_kg')
    ->groupBy('status')
    ->orderBy('status');
```

`toSql()`:

```sql
select status, count(*) AS jumlah, round(avg(weight_kg), 2) AS rata_berat_kg, min(weight_kg) AS min_kg, max(weight_kg) AS max_kg from "shipments" group by "status" order by "status" asc
```

bindings: `[]`

### 2.3 HAVING

```php
Courier::query()
    ->join('shipments', 'shipments.courier_id', '=', 'couriers.id')
    ->selectRaw('couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment')
    ->groupBy('couriers.code', 'couriers.name')
    ->havingRaw('count(shipments.id) > 62')
    ->orderByDesc('total_shipment')
    ->orderBy('couriers.code');
```

`toSql()`:

```sql
select couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment from "couriers" inner join "shipments" on "shipments"."courier_id" = "couriers"."id" group by "couriers"."code", "couriers"."name" having count(shipments.id) > 62 order by "total_shipment" desc, "couriers"."code" asc
```

bindings: `[]`

### 2.4 LEFT JOIN

```php
Courier::query()
    ->leftJoin('shipments', 'shipments.courier_id', '=', 'couriers.id')
    ->selectRaw('couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment')
    ->selectRaw('coalesce(sum(shipments.weight_kg), 0) AS total_berat_kg')
    ->groupBy('couriers.code', 'couriers.name')
    ->orderBy('total_shipment')
    ->orderBy('couriers.code');
```

`toSql()`:

```sql
select couriers.code AS courier, couriers.name, count(shipments.id) AS total_shipment, coalesce(sum(shipments.weight_kg), 0) AS total_berat_kg from "couriers" left join "shipments" on "shipments"."courier_id" = "couriers"."id" group by "couriers"."code", "couriers"."name" order by "total_shipment" asc, "couriers"."code" asc
```

bindings: `[]`

### 2.5 Perbandingan: withCount() vs JOIN + GROUP BY

```php
Courier::query()
    ->withCount('shipments')
    ->orderByDesc('shipments_count');
```

`toSql()`:

```sql
select "couriers".*, (select count(*) from "shipments" where "couriers"."id" = "shipments"."courier_id") as "shipments_count" from "couriers" order by "shipments_count" desc
```

bindings: `[]`

Perhatikan `withCount()`: Eloquent tidak memakai `JOIN` + `GROUP BY`, melainkan subquery berkorelasi di daftar `SELECT`. Untuk satu halaman daftar courier hasilnya setara, tetapi pada tabel besar subquery per baris inilah yang membuat query Eloquent terasa lambat. Versi `JOIN` + `GROUP BY` pada query 2.1 lebih mudah dioptimalkan karena satu agregasi menangani semua grup.


## 4. Catatan

- **Menjalankan ulang:** hubungkan ke database (lihat `DATABASE_URL` di `.env`), lalu jalankan `psql -f docs/sql-queries.sql`.
- **Periode bulan ini:** dataset demo hanya memuat September 2026, jadi query 2.1 memakai bulan terbaru yang ada di data. Di produksi, ganti dengan `date_trunc('month', now())`.
- **Asal nilai berat:** kolom `weight_kg` ditambahkan lewat migrasi `2026_10_02_000000_add_weight_kg_to_shipments.php`, nilainya deterministik dari md5 nomor resi (0.50 sampai 29.99 kg) supaya migrasi dan seed konsisten.
- **LEFT JOIN:** query 2.4 memakai courier `STR-017` yang belum punya shipment agar kolom agregatnya benar-benar berisi 0.
