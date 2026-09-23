-- ============================================================================
--  Anteraja Instant — Delivery Integrity Database
--  Engine   : PostgreSQL 14+ with PostGIS
--  Branch   : 6-db  (repo: anteraja-capstone-samuel)
--  Purpose  : Relational schema supporting PRD + FRD-01..FRD-05
--  Conventions
--    - snake_case, plural table names
--    - primary key: id uuid (gen_random_uuid())
--    - audit columns: created_at / updated_at timestamptz
--    - coordinates: geography(Point,4326)  (WGS84)
--    - distances  : integer, meters
--    - status/type: constrained with CHECK (portable across Postgres hosts)
--  Idempotent: safe to run once on an empty database.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
--  SHARED TRIGGER: keep updated_at fresh
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ============================================================================
--  1. REFERENCE & CONFIGURATION
-- ============================================================================

-- Operational regions / hubs (referenced by couriers, admins, shipments).
CREATE TABLE service_areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  city        text NOT NULL,
  center      geography(Point, 4326),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_areas IS 'Wilayah operasional / hub. Dipakai kurir, admin, dan pengiriman (kolom wilayah pada dashboard).';
COMMENT ON COLUMN service_areas.code IS 'Kode wilayah ringkas, mis. JKS (Jakarta Selatan).';

-- Admin / Customer Service actors (getCurrentAdmin in PRD §5).
CREATE TABLE admins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  email            text NOT NULL UNIQUE,
  role             text NOT NULL CHECK (role IN ('superadmin', 'ops_admin', 'cs_agent')),
  service_area_id  uuid REFERENCES service_areas(id) ON DELETE SET NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE admins IS 'Aktor Admin/CS. Pembuat keputusan pengecualian, override PIN, titik temu, tutup klaim, ubah radius.';

-- Geofence policy per service segment (FR-01-02 + UI "Pengaturan Radius").
CREATE TABLE geofence_policies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type         text NOT NULL UNIQUE CHECK (service_type IN ('instant', 'same_day', 'regular')),
  default_radius_m     integer NOT NULL CHECK (default_radius_m > 0),
  requires_pin         boolean NOT NULL,
  sla_minutes          integer CHECK (sla_minutes > 0),
  pin_length           integer NOT NULL DEFAULT 6 CHECK (pin_length BETWEEN 4 AND 8),
  pin_max_attempts     integer NOT NULL DEFAULT 3 CHECK (pin_max_attempts > 0),
  pin_ttl_minutes      integer NOT NULL DEFAULT 15 CHECK (pin_ttl_minutes > 0),
  pin_max_resends      integer NOT NULL DEFAULT 3 CHECK (pin_max_resends >= 0),
  protocol_version     text NOT NULL,
  updated_by           uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE geofence_policies IS 'Kebijakan radius geofence & PIN per segmen layanan. Sumber aturan radius (FR-01-02) dan kewajiban PIN (FR-03).';


-- ============================================================================
--  2. PEOPLE
-- ============================================================================

-- Couriers (getCurrentCourier in PRD §5).
CREATE TABLE couriers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  name             text NOT NULL,
  phone            text NOT NULL UNIQUE,
  service_area_id  uuid NOT NULL REFERENCES service_areas(id) ON DELETE RESTRICT,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE couriers IS 'Kurir SATRIA. Satu kurir milik satu wilayah layanan.';

-- Recipients (buyers) — contact target for PIN and meeting-point party.
CREATE TABLE recipients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE recipients IS 'Penerima / pembeli. Tujuan pengiriman PIN (email) dan pihak dalam matchmaking lokasi (FRD-04).';


-- ============================================================================
--  3. DELIVERY CORE
-- ============================================================================

-- Shipments (PRD §6).
CREATE TABLE shipments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number      text NOT NULL UNIQUE,
  service_type         text NOT NULL CHECK (service_type IN ('instant', 'same_day', 'regular')),
  courier_id           uuid REFERENCES couriers(id) ON DELETE SET NULL,
  recipient_id         uuid NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,
  service_area_id      uuid NOT NULL REFERENCES service_areas(id) ON DELETE RESTRICT,
  origin               geography(Point, 4326) NOT NULL,
  destination          geography(Point, 4326) NOT NULL,
  destination_address  text NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
  pin_required         boolean NOT NULL DEFAULT false,
  cod_amount           integer NOT NULL DEFAULT 0 CHECK (cod_amount >= 0),
  delivered_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shipments IS 'Inti pengiriman. Status akhir ditentukan oleh geofence (FRD-01) + PIN (FRD-03) + POD (FRD-02).';

-- Geofence per shipment (FRD-01). Satu geofence aktif per pengiriman.
CREATE TABLE geofences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  center       geography(Point, 4326) NOT NULL,
  radius_m     integer NOT NULL CHECK (radius_m > 0),
  source       text NOT NULL DEFAULT 'destination' CHECK (source IN ('destination', 'meeting_point')),
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE geofences IS 'Pusat & radius geofence. Pusat dapat berasal dari titik tujuan ter-geocode atau titik temu final (FR-04-07).';
CREATE UNIQUE INDEX ux_geofences_one_active
  ON geofences (shipment_id) WHERE is_active;
CREATE INDEX ix_geofences_center_gist ON geofences USING gist (center);

-- Immutable event log per shipment (PRD §6 + FRD-04/FRD-05).
CREATE TABLE delivery_events (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id               uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  courier_id                uuid REFERENCES couriers(id) ON DELETE SET NULL,
  event_type                text NOT NULL CHECK (event_type IN (
                              'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
                              'pin_verification', 'geofence_check',
                              'exception_requested', 'exception_decided',
                              'meeting_point_proposed', 'meeting_point_approved',
                              'pod_captured')),
  point                     geography(Point, 4326),
  distance_to_destination_m integer CHECK (distance_to_destination_m >= 0),
  actor_type                text NOT NULL DEFAULT 'courier'
                              CHECK (actor_type IN ('courier', 'recipient', 'admin', 'system')),
  metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_events IS 'Jejak peristiwa tak-termutasi. Setiap keputusan verifikasi (lulus/gagal) tercatat di sini, termasuk percobaan geofence & PIN.';
CREATE INDEX ix_delivery_events_shipment_created ON delivery_events (shipment_id, created_at);
CREATE INDEX ix_delivery_events_courier ON delivery_events (courier_id);
CREATE INDEX ix_delivery_events_point_gist ON delivery_events USING gist (point);


-- ============================================================================
--  4. VERIFICATION
-- ============================================================================

-- Proof of Delivery (PRD §6 + FRD-02).
CREATE TABLE delivery_proofs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id               uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  courier_id                uuid NOT NULL REFERENCES couriers(id) ON DELETE RESTRICT,
  photo_path                text NOT NULL,
  point                     geography(Point, 4326) NOT NULL,
  distance_to_destination_m integer NOT NULL CHECK (distance_to_destination_m >= 0),
  captured_at               timestamptz NOT NULL DEFAULT now(),
  device_captured_at        timestamptz,
  watermark_hash            text NOT NULL,
  watermark_address         text,
  recipient_name            text NOT NULL,
  review_status             text NOT NULL DEFAULT 'valid'
                              CHECK (review_status IN ('valid', 'needs_review', 'invalid')),
  review_note               text,
  reviewed_by               uuid REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_proofs IS 'Foto POD ber-geotag & watermark. Hanya satu POD valid per pengiriman; POD lain berstatus needs_review/invalid.';
CREATE UNIQUE INDEX ux_proofs_one_valid
  ON delivery_proofs (shipment_id) WHERE review_status = 'valid';
CREATE INDEX ix_delivery_proofs_shipment ON delivery_proofs (shipment_id);
CREATE INDEX ix_delivery_proofs_point_gist ON delivery_proofs USING gist (point);

-- PIN challenge per shipment (PRD §6 + FRD-03).
CREATE TABLE pin_challenges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      uuid NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
  recipient_id     uuid NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,
  code_hash        text NOT NULL,
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts     integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  resend_count     integer NOT NULL DEFAULT 0 CHECK (resend_count >= 0),
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'verified', 'locked', 'expired', 'override')),
  expires_at       timestamptz NOT NULL,
  verified_at      timestamptz,
  locked_at        timestamptz,
  override_by      uuid REFERENCES admins(id) ON DELETE SET NULL,
  override_reason  text,
  override_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pin_challenges IS 'Verifikasi PIN per segmen. PIN disimpan sebagai hash; override/blokir oleh admin tercatat dengan alasan.';

-- PIN delivery attempts / channel log (FRD-03 §6: kanal & template).
CREATE TABLE pin_deliveries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_challenge_id    uuid NOT NULL REFERENCES pin_challenges(id) ON DELETE CASCADE,
  channel             text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  destination         text NOT NULL,
  attempt_no          integer NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
  status              text NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  sent_at             timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pin_deliveries IS 'Riwayat pengiriman PIN (kanal, tujuan, status). Menopang batas kirim ulang FR-03-04.';
CREATE INDEX ix_pin_deliveries_challenge ON pin_deliveries (pin_challenge_id);


-- ============================================================================
--  5. EXCEPTIONS & MATCHMAKING
-- ============================================================================

-- Delivery exceptions outside geofence radius (FRD-01).
CREATE TABLE delivery_exceptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  courier_id       uuid NOT NULL REFERENCES couriers(id) ON DELETE RESTRICT,
  event_id         uuid REFERENCES delivery_events(id) ON DELETE SET NULL,
  requested_point  geography(Point, 4326) NOT NULL,
  distance_m       integer NOT NULL CHECK (distance_m >= 0),
  radius_m         integer NOT NULL CHECK (radius_m > 0),
  reason           text NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by      uuid REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_exceptions IS 'Pengajuan penyelesaian di luar radius. Status delivered hanya berubah setelah persetujuan admin (FR-01-06/07).';
CREATE UNIQUE INDEX ux_exceptions_one_pending
  ON delivery_exceptions (shipment_id) WHERE status = 'pending';
CREATE INDEX ix_delivery_exceptions_shipment ON delivery_exceptions (shipment_id);

-- Meeting points between courier and buyer (FRD-04).
CREATE TABLE meeting_points (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id                uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  proposed_by_type           text NOT NULL CHECK (proposed_by_type IN ('courier', 'recipient', 'admin')),
  proposed_by_id             uuid NOT NULL,
  proposed_point             geography(Point, 4326) NOT NULL,
  distance_from_destination_m integer NOT NULL CHECK (distance_from_destination_m >= 0),
  distance_from_buyer_m      integer CHECK (distance_from_buyer_m >= 0),
  status                     text NOT NULL DEFAULT 'proposed'
                               CHECK (status IN ('proposed', 'approved', 'rejected', 'expired', 'admin_set')),
  approved_by_type           text CHECK (approved_by_type IN ('courier', 'recipient', 'admin')),
  approved_by_id             uuid,
  expires_at                 timestamptz NOT NULL,
  resolved_at                timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE meeting_points IS 'Usulan & persetujuan titik temu. Hanya satu titik temu final (approved/admin_set) per pengiriman; pusat geofence mengikuti titik final.';
CREATE UNIQUE INDEX ux_meeting_points_one_final
  ON meeting_points (shipment_id) WHERE status IN ('approved', 'admin_set');
CREATE UNIQUE INDEX ux_meeting_points_one_proposed
  ON meeting_points (shipment_id) WHERE status = 'proposed';
CREATE INDEX ix_meeting_points_shipment ON meeting_points (shipment_id);
CREATE INDEX ix_meeting_points_point_gist ON meeting_points USING gist (proposed_point);


-- ============================================================================
--  6. CLAIMS & AUDIT
-- ============================================================================

-- Claim investigation case (FRD-05).
CREATE TABLE claim_cases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  case_number   text NOT NULL UNIQUE,
  opened_by     uuid NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'investigating', 'closed')),
  summary       text NOT NULL,
  resolution    text,
  closed_by     uuid REFERENCES admins(id) ON DELETE SET NULL,
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE claim_cases IS 'Kasus klaim per pengiriman. Penutupan kasus tidak menghapus data bukti (read-only audit trail).';

CREATE TABLE claim_findings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_case_id  uuid NOT NULL REFERENCES claim_cases(id) ON DELETE CASCADE,
  admin_id       uuid NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  finding        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE claim_findings IS 'Temuan investigasi per kasus klaim (banyak temuan per kasus).';
CREATE INDEX ix_claim_findings_case ON claim_findings (claim_case_id);

-- Anomaly flags driving the "perlu tinjauan" marker (FR-05-05/06).
CREATE TABLE anomaly_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  flag_type    text NOT NULL CHECK (flag_type IN (
                 'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
                 'pod_needs_review', 'exception_used')),
  weight       numeric(4, 2) NOT NULL DEFAULT 1.00 CHECK (weight >= 0),
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  is_resolved  boolean NOT NULL DEFAULT false,
  UNIQUE (shipment_id, flag_type)
);

COMMENT ON TABLE anomaly_flags IS 'Penanda anomali per pengiriman + bobot. Skor total (view v_shipment_anomaly_score) menentukan penanda "perlu tinjauan".';
CREATE INDEX ix_anomaly_flags_shipment ON anomaly_flags (shipment_id);

-- Access log for the audit trail page (FR-05-09).
CREATE TABLE audit_access_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   text NOT NULL DEFAULT 'admin' CHECK (actor_type IN ('admin', 'courier')),
  actor_id     uuid NOT NULL,
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  action       text NOT NULL CHECK (action IN ('view', 'export', 'close_case')),
  context      jsonb NOT NULL DEFAULT '{}'::jsonb,
  accessed_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_access_logs IS 'Log akses audit trail: siapa, kapan, pengiriman mana, aksi apa (view/export/close_case).';
CREATE INDEX ix_audit_access_logs_shipment ON audit_access_logs (shipment_id);
CREATE INDEX ix_audit_access_logs_actor ON audit_access_logs (actor_id);

-- Generic admin decision audit (FR-01/03/04/05 cross-cutting).
CREATE TABLE admin_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  action_type  text NOT NULL CHECK (action_type IN (
                 'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
                 'set_meeting_point', 'close_claim', 'update_radius', 'review_pod')),
  target_type  text NOT NULL CHECK (target_type IN (
                 'shipment', 'delivery_exception', 'pin_challenge', 'meeting_point',
                 'claim_case', 'geofence_policy', 'delivery_proof')),
  target_id    uuid NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin_actions IS 'Audit keputusan admin lintas fitur, dengan target generik dan alasan.';
CREATE INDEX ix_admin_actions_target ON admin_actions (target_type, target_id);


-- ============================================================================
--  7. UPDATED_AT TRIGGERS
-- ============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'service_areas', 'admins', 'geofence_policies', 'couriers', 'recipients',
    'shipments', 'geofences', 'pin_challenges', 'delivery_exceptions',
    'meeting_points', 'claim_cases'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at()', t);
  END LOOP;
END;
$$;


-- ============================================================================
--  8. FUNCTIONS
-- ============================================================================

-- Distance (meters) from a point to the shipment destination.
CREATE OR REPLACE FUNCTION fn_distance_to_destination(
  p_shipment_id uuid,
  p_latitude    double precision,
  p_longitude   double precision
) RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT round(
           ST_Distance(
             s.destination,
             ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
           )
         )::integer
  FROM shipments s
  WHERE s.id = p_shipment_id;
$$;

COMMENT ON FUNCTION fn_distance_to_destination(uuid, double precision, double precision)
  IS 'Jarak meter dari koordinat ke titik tujuan pengiriman (ST_Distance).';

-- Server-side geofence evaluation (FR-01-04/05/09).
CREATE OR REPLACE FUNCTION fn_evaluate_geofence(
  p_shipment_id uuid,
  p_latitude    double precision,
  p_longitude   double precision
) RETURNS TABLE (distance_m integer, radius_m integer, inside boolean)
LANGUAGE sql STABLE AS $$
  SELECT
    round(ST_Distance(g.center,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography))::integer,
    g.radius_m,
    ST_Distance(g.center,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) <= g.radius_m
  FROM geofences g
  WHERE g.shipment_id = p_shipment_id AND g.is_active
  ORDER BY g.created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION fn_evaluate_geofence(uuid, double precision, double precision)
  IS 'Evaluasi geofence di server: jarak, radius, dan lulus/tidak. Keputusan tidak pernah dihitung di klien.';


-- ============================================================================
--  9. VIEWS
-- ============================================================================

-- Full audit trail summary for one row per shipment (FRD-05).
CREATE OR REPLACE VIEW v_shipment_audit_trail AS
WITH ev AS (
  SELECT shipment_id,
         count(*)                                            AS event_count,
         max(created_at)                                     AS last_event_at,
         max(distance_to_destination_m)                      AS max_distance_m
  FROM delivery_events
  GROUP BY shipment_id
),
pod AS (
  SELECT shipment_id,
         count(*)                                            AS proof_count,
         bool_or(review_status = 'valid')                    AS has_valid_proof,
         bool_or(review_status = 'needs_review')             AS pod_needs_review
  FROM delivery_proofs
  GROUP BY shipment_id
),
pin AS (
  SELECT shipment_id,
         max(status)                                         AS pin_status,
         max(attempts)                                       AS pin_attempts
  FROM pin_challenges
  GROUP BY shipment_id
),
exc AS (
  SELECT shipment_id,
         count(*)                                            AS exception_count,
         bool_or(status = 'approved')                        AS has_approved_exception
  FROM delivery_exceptions
  GROUP BY shipment_id
),
mp AS (
  SELECT shipment_id,
         count(*)                                            AS meeting_point_count,
         bool_or(status IN ('approved', 'admin_set'))        AS has_final_meeting_point
  FROM meeting_points
  GROUP BY shipment_id
),
cl AS (
  SELECT shipment_id,
         max(status)                                         AS claim_status
  FROM claim_cases
  GROUP BY shipment_id
)
SELECT
  s.id                                AS shipment_id,
  s.tracking_number,
  s.service_type,
  s.status,
  c.name                              AS courier_name,
  s.pin_required,
  g.radius_m                          AS geofence_radius_m,
  coalesce(ev.event_count, 0)         AS event_count,
  ev.last_event_at,
  coalesce(pod.proof_count, 0)        AS proof_count,
  coalesce(pod.has_valid_proof, false) AS has_valid_proof,
  coalesce(pod.pod_needs_review, false) AS pod_needs_review,
  pin.pin_status,
  pin.pin_attempts,
  coalesce(exc.exception_count, 0)    AS exception_count,
  coalesce(exc.has_approved_exception, false) AS has_approved_exception,
  coalesce(mp.meeting_point_count, 0) AS meeting_point_count,
  coalesce(mp.has_final_meeting_point, false) AS has_final_meeting_point,
  cl.claim_status
FROM shipments s
LEFT JOIN couriers c ON c.id = s.courier_id
LEFT JOIN geofences g ON g.shipment_id = s.id AND g.is_active
LEFT JOIN ev  ON ev.shipment_id  = s.id
LEFT JOIN pod ON pod.shipment_id = s.id
LEFT JOIN pin ON pin.shipment_id = s.id
LEFT JOIN exc ON exc.shipment_id = s.id
LEFT JOIN mp  ON mp.shipment_id  = s.id
LEFT JOIN cl  ON cl.shipment_id  = s.id;

COMMENT ON VIEW v_shipment_audit_trail IS 'Satu baris ringkas per pengiriman: event, POD, PIN, pengecualian, titik temu, klaim (FRD-05).';

-- Anomaly score per shipment (FR-05-05/06). Threshold >= 2.00 => perlu tinjauan.
CREATE OR REPLACE VIEW v_shipment_anomaly_score AS
SELECT
  s.id                                  AS shipment_id,
  s.tracking_number,
  coalesce(sum(a.weight) FILTER (WHERE NOT a.is_resolved), 0)::numeric(6, 2) AS anomaly_score,
  count(a.id) FILTER (WHERE NOT a.is_resolved)                               AS open_flag_count,
  coalesce(sum(a.weight) FILTER (WHERE NOT a.is_resolved), 0) >= 2.00        AS needs_review,
  coalesce(array_agg(a.flag_type ORDER BY a.flag_type)
             FILTER (WHERE NOT a.is_resolved AND a.flag_type IS NOT NULL), '{}') AS flags
FROM shipments s
LEFT JOIN anomaly_flags a ON a.shipment_id = s.id
GROUP BY s.id, s.tracking_number;

COMMENT ON VIEW v_shipment_anomaly_score IS 'Skor anomali per pengiriman (jumlah bobot flag terbuka). >= 2.00 ditandai "perlu tinjauan".';

-- ============================================================================
--  END OF SCHEMA
-- ============================================================================
