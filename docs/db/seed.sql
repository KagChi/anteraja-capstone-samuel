-- ============================================================================
--  Anteraja Instant — Sample / Dummy Data
--  Branch : 6-db
--  Engine : PostgreSQL 14+ with PostGIS + pgcrypto
--  Run    : psql -f seed.sql  (after schema.sql)
--  Basis  : docs/data/shipments-couriers-coordinates.csv
--  Re-runnable: truncates the domain tables first.
--  Scenarios covered:
--    - normal delivery, inside/outside geofence
--    - PIN verified / locked (3x) / expired / pending
--    - POD outside geofence & device-time mismatch (needs_review)
--    - approved & pending geofence exception
--    - meeting point proposed & approved final
--    - claim case open / closed + findings
--    - anomaly flags producing 4 "perlu tinjauan" shipments
-- ============================================================================

TRUNCATE audit_access_logs, admin_actions, claim_findings, claim_cases,
         anomaly_flags, meeting_points, delivery_exceptions, pin_deliveries,
         pin_challenges, delivery_proofs, delivery_events, geofences,
         shipments, recipients, couriers, geofence_policies, admins,
         service_areas RESTART IDENTITY CASCADE;


-- ----------------------------------------------------------------------------
--  service_areas
-- ----------------------------------------------------------------------------
INSERT INTO service_areas (id, code, name, city, center) VALUES
('11111111-0000-0000-0000-000000000001', 'JKS', 'Jakarta Selatan', 'Jakarta',
 ST_SetSRID(ST_MakePoint(106.8106, -6.2615), 4326)::geography),
('11111111-0000-0000-0000-000000000002', 'JKT', 'Jakarta Timur', 'Jakarta',
 ST_SetSRID(ST_MakePoint(106.9003, -6.2250), 4326)::geography),
('11111111-0000-0000-0000-000000000003', 'JKB', 'Jakarta Barat', 'Jakarta',
 ST_SetSRID(ST_MakePoint(106.7588, -6.1683), 4326)::geography);


-- ----------------------------------------------------------------------------
--  admins
-- ----------------------------------------------------------------------------
INSERT INTO admins (id, name, email, role, service_area_id) VALUES
('22222222-0000-0000-0000-000000000001', 'Windy Kusuma',  'windy.kusuma@anteraja.example.com',  'ops_admin',  '11111111-0000-0000-0000-000000000001'),
('22222222-0000-0000-0000-000000000002', 'Agus Salim',    'agus.salim@anteraja.example.com',    'cs_agent',   '11111111-0000-0000-0000-000000000001'),
('22222222-0000-0000-0000-000000000003', 'Dedi Kurniawan','dedi.kurniawan@anteraja.example.com','ops_admin',  '11111111-0000-0000-0000-000000000002'),
('22222222-0000-0000-0000-000000000004', 'Sari Melati',   'sari.melati@anteraja.example.com',   'cs_agent',   '11111111-0000-0000-0000-000000000001'),
('22222222-0000-0000-0000-000000000005', 'Bagus Nugroho', 'bagus.nugroho@anteraja.example.com', 'superadmin', NULL);


-- ----------------------------------------------------------------------------
--  geofence_policies  (radius & PIN per segmen — FR-01-02 / FR-03)
-- ----------------------------------------------------------------------------
INSERT INTO geofence_policies
  (id, service_type, default_radius_m, requires_pin, sla_minutes,
   pin_length, pin_max_attempts, pin_ttl_minutes, pin_max_resends,
   protocol_version, updated_by) VALUES
('14141414-0000-0000-0000-000000000001', 'instant',  30, true,  120, 6, 3, 15, 3, 'Fleet Safety Protocol v4.2', '22222222-0000-0000-0000-000000000005'),
('14141414-0000-0000-0000-000000000002', 'same_day', 50, true,  240, 6, 3, 15, 3, 'Fleet Safety Protocol v4.2', '22222222-0000-0000-0000-000000000005'),
('14141414-0000-0000-0000-000000000003', 'regular', 100, false, 2880, 6, 3, 15, 3, 'Fleet Safety Protocol v4.2', '22222222-0000-0000-0000-000000000005');


-- ----------------------------------------------------------------------------
--  couriers
-- ----------------------------------------------------------------------------
INSERT INTO couriers (id, code, name, phone, service_area_id) VALUES
('33333333-0000-0000-0000-000000000001', 'STR-001', 'Budi Pratama',    '+6281200000001', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000002', 'STR-002', 'Andi Saputra',    '+6281200000002', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000003', 'STR-003', 'Joko Susilo',     '+6281200000003', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000004', 'STR-004', 'Dedi Mulyadi',    '+6281200000004', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000005', 'STR-005', 'Eko Prasetyo',    '+6281200000005', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000006', 'STR-006', 'Fajar Ramadhan',  '+6281200000006', '11111111-0000-0000-0000-000000000003'),
('33333333-0000-0000-0000-000000000007', 'STR-007', 'Gunawan Setiadi', '+6281200000007', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000008', 'STR-008', 'Hariyanto',       '+6281200000008', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000009', 'STR-009', 'Irfan Maulana',   '+6281200000009', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000010', 'STR-010', 'Kurniawan',       '+6281200000010', '11111111-0000-0000-0000-000000000002'),
('33333333-0000-0000-0000-000000000011', 'STR-011', 'Lukman Hakim',    '+6281200000011', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000012', 'STR-012', 'Maulana Yusuf',   '+6281200000012', '11111111-0000-0000-0000-000000000002'),
('33333333-0000-0000-0000-000000000013', 'STR-013', 'Nanang Suryana',  '+6281200000013', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000014', 'STR-014', 'Oki Setiana',     '+6281200000014', '11111111-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000015', 'STR-015', 'Pandu Wibowo',    '+6281200000015', '11111111-0000-0000-0000-000000000003'),
('33333333-0000-0000-0000-000000000016', 'STR-016', 'Qori Ramadhan',   '+6281200000016', '11111111-0000-0000-0000-000000000002');


-- ----------------------------------------------------------------------------
--  recipients
-- ----------------------------------------------------------------------------
INSERT INTO recipients (id, name, phone, email) VALUES
('44444444-0000-0000-0000-000000000001', 'Budi Santoso',    '+6281300000001', 'budi.santoso@example.com'),
('44444444-0000-0000-0000-000000000002', 'Siti Aminah',     '+6281300000002', 'siti.aminah@example.com'),
('44444444-0000-0000-0000-000000000003', 'Andi Wijaya',     '+6281300000003', 'andi.wijaya@example.com'),
('44444444-0000-0000-0000-000000000004', 'Dewi Lestari',    '+6281300000004', 'dewi.lestari@example.com'),
('44444444-0000-0000-0000-000000000005', 'Rizky Pratama',   '+6281300000005', 'rizky.pratama@example.com'),
('44444444-0000-0000-0000-000000000006', 'Maya Sari',       '+6281300000006', 'maya.sari@example.com'),
('44444444-0000-0000-0000-000000000007', 'Hendra Gunawan',  '+6281300000007', 'hendra.gunawan@example.com'),
('44444444-0000-0000-0000-000000000008', 'Putri Handayani', '+6281300000008', 'putri.handayani@example.com'),
('44444444-0000-0000-0000-000000000009', 'Agus Setiawan',   '+6281300000009', 'agus.setiawan@example.com'),
('44444444-0000-0000-0000-000000000010', 'Lina Marlina',    '+6281300000010', 'lina.marlina@example.com'),
('44444444-0000-0000-0000-000000000011', 'Fajar Nugraha',   '+6281300000011', 'fajar.nugraha@example.com'),
('44444444-0000-0000-0000-000000000012', 'Nadia Utami',     '+6281300000012', 'nadia.utami@example.com'),
('44444444-0000-0000-0000-000000000013', 'Bayu Prabowo',    '+6281300000013', 'bayu.prabowo@example.com'),
('44444444-0000-0000-0000-000000000014', 'Citra Kirana',    '+6281300000014', 'citra.kirana@example.com'),
('44444444-0000-0000-0000-000000000015', 'Dimas Anggara',   '+6281300000015', 'dimas.anggara@example.com');


-- ----------------------------------------------------------------------------
--  shipments  (15 rows from the sample dataset)
-- ----------------------------------------------------------------------------
INSERT INTO shipments
  (id, tracking_number, service_type, courier_id, recipient_id, service_area_id,
   origin, destination, destination_address, status, pin_required, cod_amount,
   delivered_at, created_at)
SELECT v.id::uuid, v.tracking, v.service_type, c.id, r.id, v.area::uuid,
       ST_SetSRID(ST_MakePoint(-6.229000, 106.854000), 4326)::geography,
       ST_SetSRID(ST_MakePoint(v.dest_lng, v.dest_lat), 4326)::geography,
       v.address, v.status, v.pin_required, v.cod_amount,
       v.delivered_at::timestamptz, v.created_at::timestamptz
FROM (VALUES
 ('55555555-0000-0000-0000-000000000001','AJ2509000001','instant', '33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',106.827153,-6.175392,'Jl. Senopati No. 12, Kebayoran Baru, Jakarta Selatan','delivered', true, 0,     '2026-09-22T09:14:00+07','2026-09-22T08:10:00+07'),
 ('55555555-0000-0000-0000-000000000002','AJ2509000002','instant', '33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001',106.821247,-6.208763,'Jl. Panglima Polim IX No. 45, Melawai, Jakarta Selatan','delivered', true, 0,     '2026-09-22T10:02:00+07','2026-09-22T09:30:00+07'),
 ('55555555-0000-0000-0000-000000000003','AJ2509000003','same_day','33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001',106.832000,-6.195000,'Jl. Tebet Barat Dalam No. 8, Tebet, Jakarta Selatan','delivered', true, 45000, '2026-09-22T11:20:00+07','2026-09-22T10:30:00+07'),
 ('55555555-0000-0000-0000-000000000004','AJ2509000004','regular', '33333333-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000001',106.813000,-6.260000,'Jl. Margaguna No. 3, Gandaria Utara, Jakarta Selatan','delivered', false,120000,'2026-09-22T13:45:00+07','2026-09-22T12:40:00+07'),
 ('55555555-0000-0000-0000-000000000005','AJ2509000005','instant', '33333333-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000002',106.854000,-6.229000,'Jl. Letjen Suprapto No. 21, Cempaka Putih, Jakarta Pusat','in_transit', true, 0,  NULL,                   '2026-09-22T13:10:00+07'),
 ('55555555-0000-0000-0000-000000000006','AJ2509000006','same_day','33333333-0000-0000-0000-000000000006','44444444-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000003',106.799000,-6.225000,'Jl. Panjang Arteri No. 99, Kebon Jeruk, Jakarta Barat','delivered', true, 0,     '2026-09-22T15:30:00+07','2026-09-22T14:10:00+07'),
 ('55555555-0000-0000-0000-000000000007','AJ2509000007','instant', '33333333-0000-0000-0000-000000000007','44444444-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000001',106.829000,-6.236000,'Jl. TB Simatupang No. 17, Cilandak, Jakarta Selatan','failed',    true, 0,     NULL,                   '2026-09-22T15:10:00+07'),
 ('55555555-0000-0000-0000-000000000008','AJ2509000008','instant', '33333333-0000-0000-0000-000000000008','44444444-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000001',106.742000,-6.109000,'Jl. Pahlawan No. 5, Cilandak Timur, Jakarta Selatan','pending',  true, 0,     NULL,                   '2026-09-22T15:40:00+07'),
 ('55555555-0000-0000-0000-000000000009','AJ2509000009','regular', '33333333-0000-0000-0000-000000000009','44444444-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000001',106.906000,-6.157000,'Jl. Raya Pasar Minggu No. 40, Pancoran, Jakarta Selatan','delivered', false, 0,    '2026-09-23T08:15:00+07','2026-09-23T07:10:00+07'),
 ('55555555-0000-0000-0000-000000000010','AJ2509000010','same_day','33333333-0000-0000-0000-000000000010','44444444-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000002',106.870000,-6.183000,'Jl. Cipete Raya No. 62, Cipete Selatan, Jakarta Selatan','delivered', true, 0,    '2026-09-23T09:00:00+07','2026-09-23T08:00:00+07'),
 ('55555555-0000-0000-0000-000000000011','AJ2509000011','instant', '33333333-0000-0000-0000-000000000011','44444444-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000001',106.827153,-6.175392,'Jl. Senopati No. 12, Kebayoran Baru, Jakarta Selatan','pending',  true, 0,     NULL,                   '2026-09-23T08:50:00+07'),
 ('55555555-0000-0000-0000-000000000012','AJ2509000012','same_day','33333333-0000-0000-0000-000000000012','44444444-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000002',106.832000,-6.195000,'Jl. Tebet Timur Dalam No. 15, Tebet, Jakarta Selatan','in_transit', true, 0,  NULL,                   '2026-09-23T09:40:00+07'),
 ('55555555-0000-0000-0000-000000000013','AJ2509000013','regular', '33333333-0000-0000-0000-000000000013','44444444-0000-0000-0000-000000000013','11111111-0000-0000-0000-000000000001',106.813000,-6.260000,'Jl. Margaguna No. 3, Gandaria Utara, Jakarta Selatan','failed',    false,88000, NULL,                   '2026-09-23T10:10:00+07'),
 ('55555555-0000-0000-0000-000000000014','AJ2509000014','instant', '33333333-0000-0000-0000-000000000014','44444444-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000001',106.821247,-6.208763,'Jl. Panglima Polim IX No. 45, Melawai, Jakarta Selatan','delivered', true, 0,    '2026-09-23T12:00:00+07','2026-09-23T11:00:00+07'),
 ('55555555-0000-0000-0000-000000000015','AJ2509000015','same_day','33333333-0000-0000-0000-000000000015','44444444-0000-0000-0000-000000000015','11111111-0000-0000-0000-000000000003',106.799000,-6.225000,'Jl. Panjang Arteri No. 99, Kebon Jeruk, Jakarta Barat','delivered', true, 0,     '2026-09-23T13:20:00+07','2026-09-23T12:20:00+07')
) AS v(id, tracking, service_type, courier_id, recipient_id, area, dest_lng, dest_lat, address, status, pin_required, cod_amount, delivered_at, created_at)
JOIN couriers   c ON c.id = v.courier_id::uuid
JOIN recipients r ON r.id = v.recipient_id::uuid;


-- ----------------------------------------------------------------------------
--  geofences  (radius by service_type; shipment 6 uses final meeting point)
-- ----------------------------------------------------------------------------
INSERT INTO geofences (id, shipment_id, center, radius_m, source, created_by, created_at)
SELECT g.id::uuid, s.id, ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326)::geography,
       g.radius, g.source, '22222222-0000-0000-0000-000000000005'::uuid, s.created_at
FROM (VALUES
 ('77777777-0000-0000-0000-000000000001','AJ2509000001',106.827153,-6.175392, 30,'destination'),
 ('77777777-0000-0000-0000-000000000002','AJ2509000002',106.821247,-6.208763, 30,'destination'),
 ('77777777-0000-0000-0000-000000000003','AJ2509000003',106.832000,-6.195000, 50,'destination'),
 ('77777777-0000-0000-0000-000000000004','AJ2509000004',106.813000,-6.260000,100,'destination'),
 ('77777777-0000-0000-0000-000000000005','AJ2509000005',106.854000,-6.229000, 30,'destination'),
 ('77777777-0000-0000-0000-000000000006','AJ2509000006',106.799300,-6.225200, 50,'meeting_point'),
 ('77777777-0000-0000-0000-000000000007','AJ2509000007',106.829000,-6.236000, 30,'destination'),
 ('77777777-0000-0000-0000-000000000008','AJ2509000008',106.742000,-6.109000, 30,'destination'),
 ('77777777-0000-0000-0000-000000000009','AJ2509000009',106.906000,-6.157000,100,'destination'),
 ('77777777-0000-0000-0000-000000000010','AJ2509000010',106.870000,-6.183000, 50,'destination'),
 ('77777777-0000-0000-0000-000000000011','AJ2509000011',106.827153,-6.175392, 30,'destination'),
 ('77777777-0000-0000-0000-000000000012','AJ2509000012',106.832000,-6.195000, 50,'destination'),
 ('77777777-0000-0000-0000-000000000013','AJ2509000013',106.813000,-6.260000,100,'destination'),
 ('77777777-0000-0000-0000-000000000014','AJ2509000014',106.821247,-6.208763, 30,'destination'),
 ('77777777-0000-0000-0000-000000000015','AJ2509000015',106.799000,-6.225000, 50,'destination')
) AS g(id, tracking, lng, lat, radius, source)
JOIN shipments s ON s.tracking_number = g.tracking;


-- ----------------------------------------------------------------------------
--  delivery_events  (81 rows — full audit trail)
-- ----------------------------------------------------------------------------
INSERT INTO delivery_events
  (shipment_id, courier_id, event_type, point, distance_to_destination_m, actor_type, metadata, created_at)
SELECT s.id, s.courier_id, v.event_type,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography,
       v.dist, v.actor, coalesce(v.meta, '{}'::jsonb), v.at::timestamptz
FROM (VALUES
 -- AJ2509000001 — instant, delivered, PIN verified
 ('AJ2509000001','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T08:40:00+07',NULL::jsonb),
 ('AJ2509000001','arrived',         -6.175400,106.827160,1,   'courier','2026-09-22T09:05:00+07',NULL),
 ('AJ2509000001','geofence_check',  -6.175400,106.827160,1,   'courier','2026-09-22T09:06:00+07','{"inside":true,"radius_m":30}'),
 ('AJ2509000001','pin_verification',-6.175400,106.827160,1,   'courier','2026-09-22T09:08:00+07','{"result":"verified"}'),
 ('AJ2509000001','pod_captured',    -6.175400,106.827160,1,   'courier','2026-09-22T09:13:00+07',NULL),
 ('AJ2509000001','delivered',       -6.175400,106.827160,1,   'system','2026-09-22T09:14:00+07','{"checks":["geofence","pin","pod"]}'),
 -- AJ2509000002 — instant, delivered
 ('AJ2509000002','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T09:40:00+07',NULL),
 ('AJ2509000002','arrived',         -6.208770,106.821255,1,   'courier','2026-09-22T09:55:00+07',NULL),
 ('AJ2509000002','geofence_check',  -6.208770,106.821255,1,   'courier','2026-09-22T09:56:00+07','{"inside":true,"radius_m":30}'),
 ('AJ2509000002','pin_verification',-6.208770,106.821255,1,   'courier','2026-09-22T09:58:00+07','{"result":"verified"}'),
 ('AJ2509000002','pod_captured',    -6.208770,106.821255,1,   'courier','2026-09-22T10:01:00+07',NULL),
 ('AJ2509000002','delivered',       -6.208770,106.821255,1,   'system','2026-09-22T10:02:00+07','{"checks":["geofence","pin","pod"]}'),
 -- AJ2509000003 — same_day, inside radius, delivered
 ('AJ2509000003','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T10:50:00+07',NULL),
 ('AJ2509000003','arrived',         -6.195200,106.832300,40,  'courier','2026-09-22T11:05:00+07',NULL),
 ('AJ2509000003','geofence_check',  -6.195200,106.832300,40,  'courier','2026-09-22T11:06:00+07','{"inside":true,"radius_m":50}'),
 ('AJ2509000003','pin_verification',-6.195200,106.832300,40,  'courier','2026-09-22T11:08:00+07','{"result":"verified"}'),
 ('AJ2509000003','pod_captured',    -6.195200,106.832300,40,  'courier','2026-09-22T11:18:00+07',NULL),
 ('AJ2509000003','delivered',       -6.195200,106.832300,40,  'system','2026-09-22T11:20:00+07','{"checks":["geofence","pin","pod"]}'),
 -- AJ2509000004 — regular, no PIN, inside radius
 ('AJ2509000004','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T13:00:00+07',NULL),
 ('AJ2509000004','arrived',         -6.260500,106.813600,85,  'courier','2026-09-22T13:35:00+07',NULL),
 ('AJ2509000004','geofence_check',  -6.260500,106.813600,85,  'courier','2026-09-22T13:36:00+07','{"inside":true,"radius_m":100}'),
 ('AJ2509000004','pod_captured',    -6.260500,106.813600,85,  'courier','2026-09-22T13:44:00+07',NULL),
 ('AJ2509000004','delivered',       -6.260500,106.813600,85,  'system','2026-09-22T13:45:00+07','{"checks":["geofence","pod"]}'),
 -- AJ2509000005 — instant, geofence FAIL, exception requested (pending)
 ('AJ2509000005','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T13:20:00+07',NULL),
 ('AJ2509000005','arrived',         -6.236000,106.860000,912, 'courier','2026-09-22T14:05:00+07',NULL),
 ('AJ2509000005','geofence_check',  -6.236000,106.860000,912, 'courier','2026-09-22T14:06:00+07','{"inside":false,"radius_m":30}'),
 ('AJ2509000005','delivery_attempt',-6.236000,106.860000,912, 'courier','2026-09-22T14:07:00+07','{"blocked":"outside_geofence"}'),
 ('AJ2509000005','exception_requested',-6.236000,106.860000,912,'courier','2026-09-22T14:08:00+07',NULL),
 -- AJ2509000006 — same_day, meeting point + approved exception, POD outside
 ('AJ2509000006','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T14:20:00+07',NULL),
 ('AJ2509000006','arrived',         -6.230000,106.799000,556, 'courier','2026-09-22T14:55:00+07',NULL),
 ('AJ2509000006','meeting_point_proposed',-6.225200,106.799300,33,'courier','2026-09-22T14:57:00+07',NULL),
 ('AJ2509000006','meeting_point_approved',-6.225200,106.799300,33,'recipient','2026-09-22T15:05:00+07',NULL),
 ('AJ2509000006','geofence_check',  -6.230000,106.799000,556, 'courier','2026-09-22T15:06:00+07','{"inside":false,"radius_m":50}'),
 ('AJ2509000006','exception_requested',-6.230000,106.799000,556,'courier','2026-09-22T15:07:00+07',NULL),
 ('AJ2509000006','exception_decided',NULL,NULL,NULL,          'admin','2026-09-22T15:10:00+07','{"decision":"approved"}'),
 ('AJ2509000006','pod_captured',    -6.230000,106.799000,556, 'courier','2026-09-22T15:28:00+07',NULL),
 ('AJ2509000006','delivered',       -6.230000,106.799000,556, 'system','2026-09-22T15:30:00+07','{"checks":["exception","pod"]}'),
 -- AJ2509000007 — instant, PIN locked after 3 attempts
 ('AJ2509000007','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T15:20:00+07',NULL),
 ('AJ2509000007','arrived',         -6.236100,106.829100,15,  'courier','2026-09-22T15:45:00+07',NULL),
 ('AJ2509000007','geofence_check',  -6.236100,106.829100,15,  'courier','2026-09-22T15:46:00+07','{"inside":true,"radius_m":30}'),
 ('AJ2509000007','pin_verification',-6.236100,106.829100,15,  'courier','2026-09-22T15:50:00+07','{"result":"failed","attempt":1}'),
 ('AJ2509000007','pin_verification',-6.236100,106.829100,15,  'courier','2026-09-22T15:52:00+07','{"result":"failed","attempt":2}'),
 ('AJ2509000007','pin_verification',-6.236100,106.829100,15,  'courier','2026-09-22T15:54:00+07','{"result":"failed","attempt":3,"locked":true}'),
 ('AJ2509000007','failed',          -6.236100,106.829100,15,  'system','2026-09-22T16:05:00+07','{"reason":"pin_locked"}'),
 -- AJ2509000008 — instant, PIN expired
 ('AJ2509000008','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-22T15:50:00+07',NULL),
 ('AJ2509000008','arrived',         -6.108900,106.742100,15,  'courier','2026-09-22T16:20:00+07',NULL),
 ('AJ2509000008','geofence_check',  -6.108900,106.742100,15,  'courier','2026-09-22T16:21:00+07','{"inside":true,"radius_m":30}'),
 ('AJ2509000008','pin_verification',-6.108900,106.742100,15,  'courier','2026-09-22T16:35:00+07','{"result":"expired"}'),
 -- AJ2509000009 — regular, exactly at radius boundary
 ('AJ2509000009','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T07:20:00+07',NULL),
 ('AJ2509000009','arrived',         -6.157700,106.906800,100, 'courier','2026-09-23T07:55:00+07',NULL),
 ('AJ2509000009','geofence_check',  -6.157700,106.906800,100, 'courier','2026-09-23T07:56:00+07','{"inside":true,"radius_m":100,"boundary":true}'),
 ('AJ2509000009','pod_captured',    -6.157700,106.906800,100, 'courier','2026-09-23T08:14:00+07',NULL),
 ('AJ2509000009','delivered',       -6.157700,106.906800,100, 'system','2026-09-23T08:15:00+07','{"checks":["geofence","pod"]}'),
 -- AJ2509000010 — same_day, device time mismatch
 ('AJ2509000010','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T08:10:00+07',NULL),
 ('AJ2509000010','arrived',         -6.183050,106.870050,7,   'courier','2026-09-23T08:45:00+07',NULL),
 ('AJ2509000010','geofence_check',  -6.183050,106.870050,7,   'courier','2026-09-23T08:46:00+07','{"inside":true,"radius_m":50}'),
 ('AJ2509000010','pin_verification',-6.183050,106.870050,7,   'courier','2026-09-23T08:48:00+07','{"result":"verified"}'),
 ('AJ2509000010','pod_captured',    -6.183050,106.870050,7,   'courier','2026-09-23T08:59:00+07',NULL),
 ('AJ2509000010','delivered',       -6.183050,106.870050,7,   'system','2026-09-23T09:00:00+07','{"checks":["geofence","pin","pod"]}'),
 -- AJ2509000011 — instant, within radius, awaiting PIN
 ('AJ2509000011','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T09:00:00+07',NULL),
 ('AJ2509000011','arrived',         -6.175500,106.827300,21,  'courier','2026-09-23T09:25:00+07',NULL),
 ('AJ2509000011','geofence_check',  -6.175500,106.827300,21,  'courier','2026-09-23T09:26:00+07','{"inside":true,"radius_m":30}'),
 -- AJ2509000012 — same_day, courier far, en route
 ('AJ2509000012','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T09:50:00+07',NULL),
 ('AJ2509000012','geofence_check',  -6.213000,106.845000,2170,'courier','2026-09-23T10:28:00+07','{"inside":false,"radius_m":50}'),
 -- AJ2509000013 — regular, recipient not at location
 ('AJ2509000013','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T10:20:00+07',NULL),
 ('AJ2509000013','arrived',         -6.259900,106.813100,16,  'courier','2026-09-23T10:55:00+07',NULL),
 ('AJ2509000013','geofence_check',  -6.259900,106.813100,16,  'courier','2026-09-23T10:56:00+07','{"inside":true,"radius_m":100}'),
 ('AJ2509000013','delivery_attempt',-6.259900,106.813100,16,  'courier','2026-09-23T11:05:00+07','{"reason":"recipient_not_at_location"}'),
 ('AJ2509000013','failed',          -6.259900,106.813100,16,  'system','2026-09-23T11:10:00+07','{"reason":"recipient_unavailable"}'),
 -- AJ2509000014 — instant, exception approved, delivered
 ('AJ2509000014','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T11:10:00+07',NULL),
 ('AJ2509000014','arrived',         -6.210000,106.823000,260, 'courier','2026-09-23T11:40:00+07',NULL),
 ('AJ2509000014','geofence_check',  -6.210000,106.823000,260, 'courier','2026-09-23T11:41:00+07','{"inside":false,"radius_m":30}'),
 ('AJ2509000014','exception_requested',-6.210000,106.823000,260,'courier','2026-09-23T11:42:00+07',NULL),
 ('AJ2509000014','exception_decided',NULL,NULL,NULL,           'admin','2026-09-23T11:50:00+07','{"decision":"approved"}'),
 ('AJ2509000014','delivered',       -6.210000,106.823000,260, 'system','2026-09-23T12:00:00+07','{"checks":["exception","pod"]}'),
 -- AJ2509000015 — same_day, normal
 ('AJ2509000015','pickup',          -6.229000,106.854000,NULL,'courier','2026-09-23T12:30:00+07',NULL),
 ('AJ2509000015','arrived',         -6.225100,106.799100,15,  'courier','2026-09-23T13:00:00+07',NULL),
 ('AJ2509000015','geofence_check',  -6.225100,106.799100,15,  'courier','2026-09-23T13:01:00+07','{"inside":true,"radius_m":50}'),
 ('AJ2509000015','pin_verification',-6.225100,106.799100,15,  'courier','2026-09-23T13:03:00+07','{"result":"verified"}'),
 ('AJ2509000015','pod_captured',    -6.225100,106.799100,15,  'courier','2026-09-23T13:18:00+07',NULL),
 ('AJ2509000015','delivered',       -6.225100,106.799100,15,  'system','2026-09-23T13:20:00+07','{"checks":["geofence","pin","pod"]}')
) AS v(tracking, event_type, lat, lng, dist, actor, at, meta)
JOIN shipments s ON s.tracking_number = v.tracking;


-- ----------------------------------------------------------------------------
--  delivery_proofs  (POD; watermark_hash derived with pgcrypto)
-- ----------------------------------------------------------------------------
INSERT INTO delivery_proofs
  (id, shipment_id, courier_id, photo_path, point, distance_to_destination_m,
   captured_at, device_captured_at, watermark_hash, watermark_address,
   recipient_name, review_status, review_note, reviewed_by, reviewed_at)
SELECT p.id::uuid, s.id, s.courier_id,
       'pod/' || s.tracking_number || '/pod.jpg',
       ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
       p.dist, p.captured_at::timestamptz, p.device_at::timestamptz,
       encode(digest(s.tracking_number || '|' || p.captured_at, 'sha256'), 'hex'),
       s.destination_address, r.name, p.review_status, p.review_note,
       p.reviewed_by::uuid, p.reviewed_at::timestamptz
FROM (VALUES
 ('88888888-0000-0000-0000-000000000001','AJ2509000001',106.827160,-6.175400,1,  '2026-09-22T09:13:00+07','2026-09-22T09:13:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000002','AJ2509000002',106.821255,-6.208770,1,  '2026-09-22T10:01:00+07','2026-09-22T10:01:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000003','AJ2509000003',106.832300,-6.195200,40, '2026-09-22T11:18:00+07','2026-09-22T11:18:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000004','AJ2509000004',106.813600,-6.260500,85, '2026-09-22T13:44:00+07','2026-09-22T13:44:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000005','AJ2509000006',106.799000,-6.230000,556,'2026-09-22T15:28:00+07','2026-09-22T15:28:00+07','needs_review','POD di luar radius geofence','22222222-0000-0000-0000-000000000001','2026-09-22T16:00:00+07'),
 ('88888888-0000-0000-0000-000000000006','AJ2509000009',106.906800,-6.157700,100,'2026-09-23T08:14:00+07','2026-09-23T08:14:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000007','AJ2509000010',106.870050,-6.183050,7,  '2026-09-23T09:00:00+07','2026-09-23T06:10:00+07','needs_review','Selisih waktu server/perangkat 170 menit',NULL,NULL),
 ('88888888-0000-0000-0000-000000000008','AJ2509000014',106.823000,-6.210000,260,'2026-09-23T12:00:00+07','2026-09-23T12:00:00+07','valid',       NULL,NULL,NULL),
 ('88888888-0000-0000-0000-000000000009','AJ2509000015',106.799100,-6.225100,15, '2026-09-23T13:20:00+07','2026-09-23T13:20:00+07','valid',       NULL,NULL,NULL)
) AS p(id, tracking, lng, lat, dist, captured_at, device_at, review_status, review_note, reviewed_by, reviewed_at)
JOIN shipments  s ON s.tracking_number = p.tracking
JOIN recipients r ON r.id = s.recipient_id;


-- ----------------------------------------------------------------------------
--  pin_challenges  (one per PIN-required shipment)
-- ----------------------------------------------------------------------------
INSERT INTO pin_challenges
  (id, shipment_id, recipient_id, code_hash, attempts, max_attempts, resend_count,
   status, expires_at, verified_at, locked_at, override_by, override_reason, override_at, created_at)
SELECT c.id::uuid, s.id, s.recipient_id,
       encode(digest('pin:' || s.tracking_number, 'sha256'), 'hex'),
       c.attempts, 3, c.resend_count, c.status,
       c.created_at::timestamptz + interval '15 minutes',
       c.verified_at::timestamptz, c.locked_at::timestamptz,
       c.override_by::uuid, c.override_reason, c.override_at::timestamptz,
       c.created_at::timestamptz
FROM (VALUES
 ('99999999-0000-0000-0000-000000000001','AJ2509000001',1,0,'verified','2026-09-22T09:08:00+07',NULL,NULL,NULL,NULL,'2026-09-22T09:00:00+07'),
 ('99999999-0000-0000-0000-000000000002','AJ2509000002',1,0,'verified','2026-09-22T09:58:00+07',NULL,NULL,NULL,NULL,'2026-09-22T09:50:00+07'),
 ('99999999-0000-0000-0000-000000000003','AJ2509000003',1,0,'verified','2026-09-22T11:08:00+07',NULL,NULL,NULL,NULL,'2026-09-22T11:00:00+07'),
 ('99999999-0000-0000-0000-000000000004','AJ2509000005',0,0,'pending', NULL,               NULL,NULL,NULL,NULL,'2026-09-22T14:00:00+07'),
 ('99999999-0000-0000-0000-000000000005','AJ2509000006',1,0,'verified','2026-09-22T15:04:00+07',NULL,NULL,NULL,NULL,'2026-09-22T15:00:00+07'),
 ('99999999-0000-0000-0000-000000000006','AJ2509000007',3,2,'locked',  NULL,'2026-09-22T15:54:00+07',NULL,NULL,NULL,'2026-09-22T15:40:00+07'),
 ('99999999-0000-0000-0000-000000000007','AJ2509000008',1,1,'expired', NULL,               NULL,NULL,NULL,NULL,'2026-09-22T16:15:00+07'),
 ('99999999-0000-0000-0000-000000000008','AJ2509000010',1,0,'verified','2026-09-23T08:48:00+07',NULL,NULL,NULL,NULL,'2026-09-23T08:40:00+07'),
 ('99999999-0000-0000-0000-000000000009','AJ2509000011',0,0,'pending', NULL,               NULL,NULL,NULL,NULL,'2026-09-23T09:20:00+07'),
 ('99999999-0000-0000-0000-000000000010','AJ2509000012',0,0,'pending', NULL,               NULL,NULL,NULL,NULL,'2026-09-23T10:20:00+07'),
 ('99999999-0000-0000-0000-000000000011','AJ2509000014',1,0,'verified','2026-09-23T11:45:00+07',NULL,'22222222-0000-0000-0000-000000000003','Override PIN karena akses jalan ditutup','2026-09-23T11:50:00+07','2026-09-23T11:35:00+07'),
 ('99999999-0000-0000-0000-000000000012','AJ2509000015',1,0,'verified','2026-09-23T13:03:00+07',NULL,NULL,NULL,NULL,'2026-09-23T12:55:00+07')
) AS c(id, tracking, attempts, resend_count, status, verified_at, locked_at, override_by, override_reason, override_at, created_at)
JOIN shipments s ON s.tracking_number = c.tracking;


-- ----------------------------------------------------------------------------
--  pin_deliveries  (channel log; extra rows for resends on 0007 & 0008)
-- ----------------------------------------------------------------------------
INSERT INTO pin_deliveries (pin_challenge_id, channel, destination, attempt_no, status, provider_message_id, sent_at)
SELECT pc.id, 'email', r.email, v.attempt_no, 'sent',
       'resend_' || left(pc.shipment_id::text, 8) || '_' || v.attempt_no,
       v.sent_at::timestamptz
FROM (VALUES
 ('99999999-0000-0000-0000-000000000001',1,'2026-09-22T09:00:00+07'),
 ('99999999-0000-0000-0000-000000000002',1,'2026-09-22T09:50:00+07'),
 ('99999999-0000-0000-0000-000000000003',1,'2026-09-22T11:00:00+07'),
 ('99999999-0000-0000-0000-000000000004',1,'2026-09-22T14:00:00+07'),
 ('99999999-0000-0000-0000-000000000005',1,'2026-09-22T15:00:00+07'),
 ('99999999-0000-0000-0000-000000000006',1,'2026-09-22T15:40:00+07'),
 ('99999999-0000-0000-0000-000000000006',2,'2026-09-22T15:48:00+07'),
 ('99999999-0000-0000-0000-000000000006',3,'2026-09-22T15:53:00+07'),
 ('99999999-0000-0000-0000-000000000007',1,'2026-09-22T16:15:00+07'),
 ('99999999-0000-0000-0000-000000000007',2,'2026-09-22T16:30:00+07'),
 ('99999999-0000-0000-0000-000000000008',1,'2026-09-23T08:40:00+07'),
 ('99999999-0000-0000-0000-000000000009',1,'2026-09-23T09:20:00+07'),
 ('99999999-0000-0000-0000-000000000010',1,'2026-09-23T10:20:00+07'),
 ('99999999-0000-0000-0000-000000000011',1,'2026-09-23T11:35:00+07'),
 ('99999999-0000-0000-0000-000000000012',1,'2026-09-23T12:55:00+07')
) AS v(challenge_id, attempt_no, sent_at)
JOIN pin_challenges pc ON pc.id = v.challenge_id::uuid
JOIN shipments s  ON s.id = pc.shipment_id
JOIN recipients r ON r.id = s.recipient_id;


-- ----------------------------------------------------------------------------
--  delivery_exceptions
-- ----------------------------------------------------------------------------
INSERT INTO delivery_exceptions
  (id, shipment_id, courier_id, event_id, requested_point, distance_m, radius_m,
   reason, status, reviewed_by, reviewed_at, review_note, created_at)
SELECT e.id::uuid, s.id, s.courier_id, ev.id,
       ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
       e.distance_m, e.radius_m, e.reason, e.status,
       e.reviewed_by::uuid, e.reviewed_at::timestamptz, e.review_note,
       e.created_at::timestamptz
FROM (VALUES
 ('bbbbbbbb-0000-0000-0000-000000000001','AJ2509000005',106.860000,-6.236000,912,30,'Sinyal GPS lemah di area gedung, penerima tidak berada di titik tujuan','pending',NULL,NULL,NULL,'2026-09-22T14:08:00+07'),
 ('bbbbbbbb-0000-0000-0000-000000000002','AJ2509000006',106.799000,-6.230000,556,50,'Penerima meminta serah terima di lobi gedung berbeda','approved','22222222-0000-0000-0000-000000000001','2026-09-22T15:10:00+07','Disetujui setelah verifikasi titik temu & POD','2026-09-22T15:07:00+07'),
 ('bbbbbbbb-0000-0000-0000-000000000003','AJ2509000014',106.823000,-6.210000,260,30,'Akses jalan menuju titik tujuan ditutup','approved','22222222-0000-0000-0000-000000000003','2026-09-23T11:50:00+07','Disetujui, akses jalan ditutup sementara','2026-09-23T11:42:00+07')
) AS e(id, tracking, lng, lat, distance_m, radius_m, reason, status, reviewed_by, reviewed_at, review_note, created_at)
JOIN shipments s ON s.tracking_number = e.tracking
LEFT JOIN delivery_events ev
  ON ev.shipment_id = s.id AND ev.event_type = 'exception_requested';


-- ----------------------------------------------------------------------------
--  meeting_points  (shipment 6 final approved; shipment 5 still proposed)
-- ----------------------------------------------------------------------------
INSERT INTO meeting_points
  (id, shipment_id, proposed_by_type, proposed_by_id, proposed_point,
   distance_from_destination_m, distance_from_buyer_m, status,
   approved_by_type, approved_by_id, expires_at, resolved_at, created_at)
SELECT m.id::uuid, s.id, m.proposed_by_type, m.proposed_by_id::uuid,
       ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326)::geography,
       m.dist_dest, m.dist_buyer, m.status, m.approved_by_type,
       m.approved_by_id::uuid, m.expires_at::timestamptz, m.resolved_at::timestamptz,
       m.created_at::timestamptz
FROM (VALUES
 ('cccccccc-0000-0000-0000-000000000001','AJ2509000006','courier','33333333-0000-0000-0000-000000000006',106.799300,-6.225200,33,45,'approved','recipient','44444444-0000-0000-0000-000000000006','2026-09-22T15:30:00+07','2026-09-22T15:05:00+07','2026-09-22T14:57:00+07'),
 ('cccccccc-0000-0000-0000-000000000002','AJ2509000005','courier','33333333-0000-0000-0000-000000000005',106.858000,-6.235000,900,NULL,'proposed',NULL,NULL,'2026-09-22T14:40:00+07',NULL,'2026-09-22T14:10:00+07')
) AS m(id, tracking, proposed_by_type, proposed_by_id, lng, lat, dist_dest, dist_buyer, status, approved_by_type, approved_by_id, expires_at, resolved_at, created_at)
JOIN shipments s ON s.tracking_number = m.tracking;


-- ----------------------------------------------------------------------------
--  claim_cases + claim_findings
-- ----------------------------------------------------------------------------
INSERT INTO claim_cases
  (id, shipment_id, case_number, opened_by, status, summary, resolution, closed_by, closed_at, created_at)
SELECT c.id::uuid, s.id, c.case_number, c.opened_by::uuid, c.status, c.summary,
       c.resolution, c.closed_by::uuid, c.closed_at::timestamptz, c.created_at::timestamptz
FROM (VALUES
 ('dddddddd-0000-0000-0000-000000000001','AJ2509000006','CLM-2609-0001','22222222-0000-0000-0000-000000000002','investigating','POD diterima di luar radius geofence tujuan',NULL,NULL,NULL,'2026-09-22T16:05:00+07'),
 ('dddddddd-0000-0000-0000-000000000002','AJ2509000007','CLM-2609-0002','22222222-0000-0000-0000-000000000001','closed','PIN terkunci setelah 3 percobaan salah','Penerima tidak menerima PIN; pengiriman dijadwalkan ulang','22222222-0000-0000-0000-000000000001','2026-09-22T17:00:00+07','2026-09-22T16:10:00+07')
) AS c(id, tracking, case_number, opened_by, status, summary, resolution, closed_by, closed_at, created_at)
JOIN shipments s ON s.tracking_number = c.tracking;

INSERT INTO claim_findings (id, claim_case_id, admin_id, finding) VALUES
('eeeeeeee-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','POD menunjukkan lokasi 556 m dari tujuan, namun pengecualian disetujui admin.'),
('eeeeeeee-0000-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002','Titik temu final disetujui penerima; pusat geofence dialihkan ke titik temu.'),
('eeeeeeee-0000-0000-0000-000000000003','dddddddd-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','Riwayat pengiriman PIN tercatat 3 kali ke email penerima tanpa bukti dibaca.');


-- ----------------------------------------------------------------------------
--  anomaly_flags  (drives v_shipment_anomaly_score; 4 flagged shipments)
-- ----------------------------------------------------------------------------
INSERT INTO anomaly_flags (id, shipment_id, flag_type, weight, details) VALUES
('ffffffff-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000005','out_of_radius',      2.00, '{"distance_m":912,"radius_m":30}'),
('ffffffff-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000006','out_of_radius',      1.50, '{"distance_m":556,"radius_m":50}'),
('ffffffff-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000006','pod_needs_review',   1.00, '{"proof":"88888888-0000-0000-0000-000000000005"}'),
('ffffffff-0000-0000-0000-000000000004','55555555-0000-0000-0000-000000000006','exception_used',     0.50, '{"exception":"bbbbbbbb-0000-0000-0000-000000000002"}'),
('ffffffff-0000-0000-0000-000000000005','55555555-0000-0000-0000-000000000007','repeated_pin_failure',2.00,'{"attempts":3}'),
('ffffffff-0000-0000-0000-000000000006','55555555-0000-0000-0000-000000000010','device_time_mismatch',2.00,'{"server":"2026-09-23T09:00:00+07","device":"2026-09-23T06:10:00+07","delta_minutes":170}'),
('ffffffff-0000-0000-0000-000000000007','55555555-0000-0000-0000-000000000014','exception_used',     0.50, '{"exception":"bbbbbbbb-0000-0000-0000-000000000003"}');


-- ----------------------------------------------------------------------------
--  audit_access_logs  (FR-05-09; courier may read own shipment FR-05-10)
-- ----------------------------------------------------------------------------
INSERT INTO audit_access_logs (id, actor_type, actor_id, shipment_id, action, context, accessed_at) VALUES
('12121212-0000-0000-0000-000000000001','admin',  '22222222-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000006','view',       '{"page":"/admin/shipments/AJ2509000006"}','2026-09-22T16:10:00+07'),
('12121212-0000-0000-0000-000000000002','admin',  '22222222-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000006','export',     '{"format":"csv","records":1}','2026-09-22T16:15:00+07'),
('12121212-0000-0000-0000-000000000003','admin',  '22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000007','view',       '{"page":"/admin/shipments/AJ2509000007"}','2026-09-22T16:30:00+07'),
('12121212-0000-0000-0000-000000000004','admin',  '22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000007','close_case', '{"case":"CLM-2609-0002"}','2026-09-22T17:00:00+07'),
('12121212-0000-0000-0000-000000000005','courier','33333333-0000-0000-0000-000000000007','55555555-0000-0000-0000-000000000007','view',       '{"page":"/courier/shipments/AJ2509000007"}','2026-09-22T16:20:00+07');


-- ----------------------------------------------------------------------------
--  admin_actions  (cross-cutting decision audit)
-- ----------------------------------------------------------------------------
INSERT INTO admin_actions (id, admin_id, action_type, target_type, target_id, reason) VALUES
('13131313-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','approve_exception','delivery_exception','bbbbbbbb-0000-0000-0000-000000000002','Titik temu & POD terverifikasi'),
('13131313-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003','approve_exception','delivery_exception','bbbbbbbb-0000-0000-0000-000000000003','Akses jalan ditutup sementara'),
('13131313-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','close_claim',      'claim_case',        'dddddddd-0000-0000-0000-000000000002','Pengiriman dijadwalkan ulang'),
('13131313-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000005','update_radius',    'geofence_policy',   '14141414-0000-0000-0000-000000000001','Sinkronisasi Fleet Safety Protocol v4.2'),
('13131313-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001','review_pod',       'delivery_proof',    '88888888-0000-0000-0000-000000000005','POD di luar geofence, tetap dipakai setelah persetujuan');

-- ============================================================================
--  END OF SEED
-- ============================================================================
