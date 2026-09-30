<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
        SQL);

        DB::statement(<<<'SQL'
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
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS v_shipment_anomaly_score');
        DB::statement('DROP VIEW IF EXISTS v_shipment_audit_trail');
    }
};
