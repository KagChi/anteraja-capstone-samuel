-- ============================================================================
--  Anteraja Instant — Verification Queries
--  Branch : 6-db
--  Run    : psql -f queries.sql  (after schema.sql + seed.sql)
--  Purpose: demonstrate that the schema answers each FRD's requirements.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  FRD-01 — Geofencing lock: server-side radius decision
-- ----------------------------------------------------------------------------
-- a) Radius policy per service segment (FR-01-02)
SELECT service_type, default_radius_m, requires_pin, protocol_version
FROM geofence_policies
ORDER BY default_radius_m;

-- b) Evaluate the geofence for shipment AJ2509000001 (courier 1 m away -> inside)
SELECT * FROM fn_evaluate_geofence('55555555-0000-0000-0000-000000000001', -6.175400, 106.827160);

-- c) Same shipment, a far position -> outside (button would lock)
SELECT * FROM fn_evaluate_geofence('55555555-0000-0000-0000-000000000001', -6.190000, 106.840000);

-- d) Distance in meters to destination (FT-01-04)
SELECT id AS shipment_id, fn_distance_to_destination(id, -6.175400, 106.827160) AS distance_m
FROM shipments WHERE tracking_number = 'AJ2509000001';

-- e) Geofence decisions logged as events (FR-01-08)
SELECT s.tracking_number, e.event_type, e.distance_to_destination_m,
       g.radius_m, (e.distance_to_destination_m <= g.radius_m) AS inside, e.created_at
FROM delivery_events e
JOIN shipments s ON s.id = e.shipment_id
JOIN geofences g ON g.shipment_id = s.id AND g.is_active
WHERE e.event_type = 'geofence_check'
ORDER BY s.tracking_number;

-- f) Exception queue (FR-01-06/07)
SELECT s.tracking_number, c.code AS courier, x.distance_m, x.radius_m, x.status,
       x.reason, a.name AS reviewed_by
FROM delivery_exceptions x
JOIN shipments s ON s.id = x.shipment_id
JOIN couriers  c ON c.id = x.courier_id
LEFT JOIN admins a ON a.id = x.reviewed_by
ORDER BY x.created_at;


-- ----------------------------------------------------------------------------
--  FRD-02 — Geotagged & watermarked Proof of Delivery
-- ----------------------------------------------------------------------------
SELECT s.tracking_number, p.recipient_name, p.distance_to_destination_m,
       p.captured_at, p.device_captured_at,
       round(extract(epoch FROM (p.captured_at - p.device_captured_at)) / 60) AS device_delta_minutes,
       p.review_status, left(p.watermark_hash, 16) || '…' AS watermark_hash
FROM delivery_proofs p
JOIN shipments s ON s.id = p.shipment_id
ORDER BY s.tracking_number;


-- ----------------------------------------------------------------------------
--  FRD-03 — PIN verification per service segment
-- ----------------------------------------------------------------------------
-- a) Challenge state per shipment (raw PIN never stored — only hash)
SELECT s.tracking_number, s.service_type, pc.status, pc.attempts || '/' || pc.max_attempts AS attempts,
       pc.resend_count, pc.expires_at, pc.verified_at, pc.locked_at,
       left(pc.code_hash, 12) || '…' AS code_hash, a.name AS override_by
FROM pin_challenges pc
JOIN shipments s ON s.id = pc.shipment_id
LEFT JOIN admins a ON a.id = pc.override_by
ORDER BY s.tracking_number;

-- b) PIN delivery log (FR-03-04 resend limit)
SELECT s.tracking_number, d.channel, d.destination, d.attempt_no, d.status, d.sent_at
FROM pin_deliveries d
JOIN pin_challenges pc ON pc.id = d.pin_challenge_id
JOIN shipments s ON s.id = pc.shipment_id
ORDER BY s.tracking_number, d.attempt_no;

-- c) PIN-required shipments without verified/override PIN must not be delivered (FR-03-07)
SELECT s.tracking_number, s.service_type, s.status, pc.status AS pin_status
FROM shipments s
JOIN pin_challenges pc ON pc.shipment_id = s.id
WHERE s.status = 'delivered' AND pc.status NOT IN ('verified', 'override');


-- ----------------------------------------------------------------------------
--  FRD-04 — Location matchmaking (courier <-> buyer)
-- ----------------------------------------------------------------------------
SELECT s.tracking_number, m.status, m.proposed_by_type, m.approved_by_type,
       m.distance_from_destination_m AS dist_to_destination_m,
       m.distance_from_buyer_m       AS dist_to_buyer_m,
       m.expires_at, m.resolved_at
FROM meeting_points m
JOIN shipments s ON s.id = m.shipment_id
ORDER BY s.tracking_number, m.created_at;

-- Geofence centered on the approved meeting point (FR-04-07)
SELECT s.tracking_number, g.source, g.radius_m
FROM geofences g
JOIN shipments s ON s.id = g.shipment_id
WHERE g.is_active AND g.source = 'meeting_point';


-- ----------------------------------------------------------------------------
--  FRD-05 — Audit trail & claim investigation
-- ----------------------------------------------------------------------------
-- a) One-row audit summary per shipment
SELECT tracking_number, courier_name, status, geofence_radius_m,
       event_count, proof_count, has_valid_proof, pod_needs_review,
       pin_status, exception_count, has_approved_exception,
       has_final_meeting_point, claim_status
FROM v_shipment_audit_trail
ORDER BY tracking_number;

-- b) Full ordered event trail for one shipment
SELECT event_type, distance_to_destination_m AS distance_m, actor_type, metadata, created_at
FROM delivery_events
WHERE shipment_id = '55555555-0000-0000-0000-000000000006'
ORDER BY created_at;

-- c) Anomaly score — shipments above threshold are "perlu tinjauan" (FR-05-06)
SELECT tracking_number, anomaly_score, open_flag_count, flags, needs_review
FROM v_shipment_anomaly_score
ORDER BY anomaly_score DESC, tracking_number;

-- d) Claim cases with findings
SELECT cc.case_number, s.tracking_number, cc.status, cc.summary, cc.resolution,
       a.name AS opened_by, count(f.id) AS finding_count
FROM claim_cases cc
JOIN shipments s ON s.id = cc.shipment_id
JOIN admins a ON a.id = cc.opened_by
LEFT JOIN claim_findings f ON f.claim_case_id = cc.id
GROUP BY cc.id, s.tracking_number, a.name
ORDER BY cc.case_number;

-- e) Audit trail access log (FR-05-09)
SELECT actor_type, actor_id, shipment_id, action, accessed_at
FROM audit_access_logs
ORDER BY accessed_at;


-- ----------------------------------------------------------------------------
--  INTEGRITY / NORMALIZATION CHECKS
-- ----------------------------------------------------------------------------
-- Row counts per table
SELECT 'service_areas' AS table_name, count(*) FROM service_areas
UNION ALL SELECT 'admins', count(*) FROM admins
UNION ALL SELECT 'geofence_policies', count(*) FROM geofence_policies
UNION ALL SELECT 'couriers', count(*) FROM couriers
UNION ALL SELECT 'recipients', count(*) FROM recipients
UNION ALL SELECT 'shipments', count(*) FROM shipments
UNION ALL SELECT 'geofences', count(*) FROM geofences
UNION ALL SELECT 'delivery_events', count(*) FROM delivery_events
UNION ALL SELECT 'delivery_proofs', count(*) FROM delivery_proofs
UNION ALL SELECT 'pin_challenges', count(*) FROM pin_challenges
UNION ALL SELECT 'pin_deliveries', count(*) FROM pin_deliveries
UNION ALL SELECT 'delivery_exceptions', count(*) FROM delivery_exceptions
UNION ALL SELECT 'meeting_points', count(*) FROM meeting_points
UNION ALL SELECT 'claim_cases', count(*) FROM claim_cases
UNION ALL SELECT 'claim_findings', count(*) FROM claim_findings
UNION ALL SELECT 'anomaly_flags', count(*) FROM anomaly_flags
UNION ALL SELECT 'audit_access_logs', count(*) FROM audit_access_logs
UNION ALL SELECT 'admin_actions', count(*) FROM admin_actions
ORDER BY table_name;

-- Invariant: at most one active geofence and one valid POD per shipment
SELECT 'active geofences' AS invariant, count(*) AS violations
FROM (SELECT shipment_id FROM geofences WHERE is_active
      GROUP BY shipment_id HAVING count(*) > 1) t
UNION ALL
SELECT 'valid PODs', count(*)
FROM (SELECT shipment_id FROM delivery_proofs WHERE review_status = 'valid'
      GROUP BY shipment_id HAVING count(*) > 1) t
UNION ALL
SELECT 'final meeting points', count(*)
FROM (SELECT shipment_id FROM meeting_points WHERE status IN ('approved', 'admin_set')
      GROUP BY shipment_id HAVING count(*) > 1) t;
