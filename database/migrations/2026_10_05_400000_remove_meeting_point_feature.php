<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the FRD-04 location matchmaking ("Titik Temu") feature from the
 * schema: the meeting_points table, the geofence/event/action values that only
 * existed for it, and the meeting point aggregates in the audit view.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Rows that reference the removed feature would violate the narrowed
        // CHECK constraints below, so clear them first.
        DB::table('delivery_events')->whereIn('event_type', [
            'meeting_point_proposed', 'meeting_point_approved',
            'meeting_point_rejected', 'meeting_point_expired',
        ])->delete();

        DB::table('admin_actions')->whereIn('action_type', [
            'set_meeting_point', 'approve_meeting_point', 'reject_meeting_point',
        ])->delete();

        DB::table('admin_actions')->where('target_type', 'meeting_point')->delete();

        // Geofences centred on a meeting point lose their meaning; the master
        // destination is the only completion centre left.
        DB::table('geofences')->where('source', 'meeting_point')->delete();

        // The audit view aggregates meeting_points, so redefine it before the
        // table is dropped.
        DB::statement('DROP VIEW IF EXISTS v_shipment_audit_trail');
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
              cl.claim_status
            FROM shipments s
            LEFT JOIN couriers c ON c.id = s.courier_id
            LEFT JOIN geofences g ON g.shipment_id = s.id AND g.is_active
            LEFT JOIN ev  ON ev.shipment_id  = s.id
            LEFT JOIN pod ON pod.shipment_id = s.id
            LEFT JOIN pin ON pin.shipment_id = s.id
            LEFT JOIN exc ON exc.shipment_id = s.id
            LEFT JOIN cl  ON cl.shipment_id  = s.id;
        SQL);

        DB::statement('ALTER TABLE geofences DROP CONSTRAINT IF EXISTS geofences_source_check');
        DB::statement("ALTER TABLE geofences ADD CONSTRAINT geofences_source_check CHECK (source IN ('destination'))");

        DB::statement('ALTER TABLE delivery_events DROP CONSTRAINT IF EXISTS delivery_events_event_type_check');
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'pod_captured', 'gps_blocked', 'gps_lock_requested', 'gps_lock_decided'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_action_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'close_claim', 'update_radius', 'review_pod',
            'approve_gps_lock', 'reject_gps_lock'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_target_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_target_type_check CHECK (target_type IN (
            'shipment', 'delivery_exception', 'pin_challenge',
            'claim_case', 'geofence_policy', 'delivery_proof', 'gps_lock_request'))");

        Schema::dropIfExists('meeting_points');
    }

    public function down(): void
    {
        // Recreate meeting_points as migrations 000005 (+ 300000) left it.
        Schema::create('meeting_points', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->string('proposed_by_type');
            $table->uuid('proposed_by_id');
            $table->geography('proposed_point', 'point', 4326);
            $table->integer('distance_from_destination_m');
            $table->integer('distance_from_buyer_m')->nullable();
            $table->geography('buyer_point', 'point', 4326)->nullable();
            $table->string('status')->default('proposed');
            $table->string('approved_by_type')->nullable();
            $table->uuid('approved_by_id')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
        });

        DB::statement("ALTER TABLE meeting_points ADD CONSTRAINT meeting_points_proposed_by_type_check CHECK (proposed_by_type IN ('courier', 'recipient', 'admin'))");
        DB::statement('ALTER TABLE meeting_points ADD CONSTRAINT meeting_points_distance_from_destination_m_check CHECK (distance_from_destination_m >= 0)');
        DB::statement('ALTER TABLE meeting_points ADD CONSTRAINT meeting_points_distance_from_buyer_m_check CHECK (distance_from_buyer_m IS NULL OR distance_from_buyer_m >= 0)');
        DB::statement("ALTER TABLE meeting_points ADD CONSTRAINT meeting_points_status_check CHECK (status IN ('proposed', 'approved', 'rejected', 'expired', 'admin_set'))");
        DB::statement("ALTER TABLE meeting_points ADD CONSTRAINT meeting_points_approved_by_type_check CHECK (approved_by_type IS NULL OR approved_by_type IN ('courier', 'recipient', 'admin'))");
        DB::statement("CREATE UNIQUE INDEX ux_meeting_points_one_final ON meeting_points (shipment_id) WHERE status IN ('approved', 'admin_set')");
        DB::statement("CREATE UNIQUE INDEX ux_meeting_points_one_proposed ON meeting_points (shipment_id) WHERE status = 'proposed'");
        DB::statement('CREATE INDEX ix_meeting_points_shipment ON meeting_points (shipment_id)');
        DB::statement('CREATE INDEX ix_meeting_points_point_gist ON meeting_points USING gist (proposed_point)');
        DB::statement('CREATE INDEX ix_meeting_points_buyer_gist ON meeting_points USING gist (buyer_point)');

        DB::statement('ALTER TABLE geofences DROP CONSTRAINT IF EXISTS geofences_source_check');
        DB::statement("ALTER TABLE geofences ADD CONSTRAINT geofences_source_check CHECK (source IN ('destination', 'meeting_point'))");

        DB::statement('ALTER TABLE delivery_events DROP CONSTRAINT IF EXISTS delivery_events_event_type_check');
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'meeting_point_proposed', 'meeting_point_approved',
            'meeting_point_rejected', 'meeting_point_expired',
            'pod_captured', 'gps_blocked', 'gps_lock_requested', 'gps_lock_decided'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_action_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'set_meeting_point', 'close_claim', 'update_radius', 'review_pod',
            'approve_gps_lock', 'reject_gps_lock',
            'approve_meeting_point', 'reject_meeting_point'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_target_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_target_type_check CHECK (target_type IN (
            'shipment', 'delivery_exception', 'pin_challenge', 'meeting_point',
            'claim_case', 'geofence_policy', 'delivery_proof', 'gps_lock_request'))");

        DB::statement('DROP VIEW IF EXISTS v_shipment_audit_trail');
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
    }
};
