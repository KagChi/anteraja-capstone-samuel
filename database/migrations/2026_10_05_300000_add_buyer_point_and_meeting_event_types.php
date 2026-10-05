<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // FRD-04: the buyer's reported position is part of the matchmaking
        // evidence, so the destination -> buyer distance can be audited.
        Schema::table('meeting_points', function (Blueprint $table) {
            $table->geography('buyer_point', 'point', 4326)->nullable();
        });

        DB::statement('CREATE INDEX ix_meeting_points_buyer_gist ON meeting_points USING gist (buyer_point)');

        DB::statement('ALTER TABLE delivery_events DROP CONSTRAINT delivery_events_event_type_check');
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'meeting_point_proposed', 'meeting_point_approved',
            'meeting_point_rejected', 'meeting_point_expired',
            'pod_captured', 'gps_blocked', 'gps_lock_requested', 'gps_lock_decided'))");

        DB::statement('ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check');
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'set_meeting_point', 'close_claim', 'update_radius', 'review_pod',
            'approve_gps_lock', 'reject_gps_lock',
            'approve_meeting_point', 'reject_meeting_point'))");
    }

    public function down(): void
    {
        DB::table('delivery_events')->whereIn('event_type', ['meeting_point_rejected', 'meeting_point_expired'])->delete();
        DB::table('admin_actions')->whereIn('action_type', ['approve_meeting_point', 'reject_meeting_point'])->delete();

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

        DB::statement('DROP INDEX IF EXISTS ix_meeting_points_buyer_gist');

        Schema::table('meeting_points', function (Blueprint $table) {
            $table->dropColumn('buyer_point');
        });
    }
};
