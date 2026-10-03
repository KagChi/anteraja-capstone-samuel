-- ============================================================================
--  Day 14 - Analisis Data Pengiriman (SQL murni, tanpa Eloquent)
--  Branch  : feature/sql-analysis
--  Database: PostgreSQL - skema Anteraja dari Hari 3
--            (1000 shipment, 17 courier, kolom shipments.weight_kg)
--  Jalankan: psql -f docs/sql-queries.sql    (hasil lengkap di docs/sql-queries.md)
-- ============================================================================
-- 1.1) Shipment in_transit diurutkan dari yang terberat
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

-- 1.2) Kategori berat Small / Medium / Large dengan CASE
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

-- 1.3) Rekap jumlah shipment per kategori berat
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

-- 2.1) Total shipment per courier bulan ini
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

-- 2.2) Rata-rata berat shipment per status
SELECT s.status,
       count(*) AS jumlah,
       round(avg(s.weight_kg), 2) AS rata_berat_kg,
       min(s.weight_kg) AS min_kg,
       max(s.weight_kg) AS max_kg
FROM shipments s
GROUP BY s.status
ORDER BY s.status;

-- 2.3) Courier dengan lebih dari 62 shipment (HAVING)
SELECT c.code AS courier,
       c.name,
       count(s.id) AS total_shipment
FROM couriers c
JOIN shipments s ON s.courier_id = c.id
GROUP BY c.code, c.name
HAVING count(s.id) > 62
ORDER BY total_shipment DESC, c.code;

-- 2.4) Seluruh courier, termasuk yang belum punya shipment (LEFT JOIN)
SELECT c.code AS courier,
       c.name,
       count(s.id) AS total_shipment,
       coalesce(sum(s.weight_kg), 0) AS total_berat_kg
FROM couriers c
LEFT JOIN shipments s ON s.courier_id = c.id
GROUP BY c.code, c.name
ORDER BY total_shipment ASC, c.code;

