<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // FRD-06: a blocked courier files a review request; an admin approves
        // or rejects it, which unlocks the GPS gate for the shipment.
        Schema::create('gps_lock_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->uuid('courier_id');
            $table->geography('point', 'point', 4326);
            $table->integer('accuracy_m')->nullable();
            $table->jsonb('evidence')->default('{}');
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->uuid('reviewed_by')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('courier_id')->references('id')->on('couriers')->restrictOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement("ALTER TABLE gps_lock_requests ADD CONSTRAINT gps_lock_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))");
        DB::statement('ALTER TABLE gps_lock_requests ADD CONSTRAINT gps_lock_requests_accuracy_m_check CHECK (accuracy_m IS NULL OR accuracy_m >= 0)');
        DB::statement("CREATE UNIQUE INDEX ux_gps_lock_requests_one_pending ON gps_lock_requests (shipment_id) WHERE status = 'pending'");
        DB::statement('CREATE INDEX ix_gps_lock_requests_shipment ON gps_lock_requests (shipment_id)');
        DB::statement(
            'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON gps_lock_requests
             FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at()'
        );

        // The evidence behind the review decision is stored with the POD so
        // the audit trail can render it without replaying the detector.
        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->integer('gps_accuracy_m')->nullable();
            $table->jsonb('gps_evidence')->nullable();
        });

        DB::statement('ALTER TABLE anomaly_flags DROP CONSTRAINT anomaly_flags_flag_type_check');
        DB::statement("ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_flag_type_check CHECK (flag_type IN (
            'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
            'pod_needs_review', 'exception_used', 'pod_invalid', 'mock_gps_suspected'))");

        DB::statement('ALTER TABLE delivery_events DROP CONSTRAINT delivery_events_event_type_check');
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'meeting_point_proposed', 'meeting_point_approved',
            'pod_captured', 'gps_blocked', 'gps_lock_requested', 'gps_lock_decided'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'set_meeting_point', 'close_claim', 'update_radius', 'review_pod',
            'approve_gps_lock', 'reject_gps_lock'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_target_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_target_type_check CHECK (target_type IN (
            'shipment', 'delivery_exception', 'pin_challenge', 'meeting_point',
            'claim_case', 'geofence_policy', 'delivery_proof', 'gps_lock_request'))");
    }

    public function down(): void
    {
        DB::table('anomaly_flags')->where('flag_type', 'mock_gps_suspected')->delete();
        DB::table('delivery_events')->whereIn('event_type', ['gps_blocked', 'gps_lock_requested', 'gps_lock_decided'])->delete();
        DB::table('admin_actions')->whereIn('action_type', ['approve_gps_lock', 'reject_gps_lock'])->delete();

        DB::statement('ALTER TABLE anomaly_flags DROP CONSTRAINT anomaly_flags_flag_type_check');
        DB::statement("ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_flag_type_check CHECK (flag_type IN (
            'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
            'pod_needs_review', 'exception_used', 'pod_invalid'))");

        DB::statement('ALTER TABLE delivery_events DROP CONSTRAINT delivery_events_event_type_check');
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'meeting_point_proposed', 'meeting_point_approved',
            'pod_captured'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'set_meeting_point', 'close_claim', 'update_radius', 'review_pod'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_target_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_target_type_check CHECK (target_type IN (
            'shipment', 'delivery_exception', 'pin_challenge', 'meeting_point',
            'claim_case', 'geofence_policy', 'delivery_proof'))");

        DB::statement('DROP TRIGGER IF EXISTS trg_touch_updated_at ON gps_lock_requests');
        Schema::dropIfExists('gps_lock_requests');

        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->dropColumn(['gps_accuracy_m', 'gps_evidence']);
        });
    }
};
