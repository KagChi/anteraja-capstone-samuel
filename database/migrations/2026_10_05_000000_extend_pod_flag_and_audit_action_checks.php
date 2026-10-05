<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // FR-02-09: an admin-invalidated POD raises its own anomaly flag and
        // the review itself is written to the audit access log.
        DB::statement('ALTER TABLE anomaly_flags DROP CONSTRAINT anomaly_flags_flag_type_check');
        DB::statement("ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_flag_type_check CHECK (flag_type IN (
            'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
            'pod_needs_review', 'exception_used', 'pod_invalid'))");

        DB::statement('ALTER TABLE audit_access_logs DROP CONSTRAINT audit_access_logs_action_check');
        DB::statement("ALTER TABLE audit_access_logs ADD CONSTRAINT audit_access_logs_action_check CHECK (action IN (
            'view', 'export', 'close_case', 'review_pod'))");
    }

    public function down(): void
    {
        DB::table('anomaly_flags')->where('flag_type', 'pod_invalid')->delete();

        DB::statement('ALTER TABLE anomaly_flags DROP CONSTRAINT anomaly_flags_flag_type_check');
        DB::statement("ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_flag_type_check CHECK (flag_type IN (
            'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
            'pod_needs_review', 'exception_used'))");

        DB::table('audit_access_logs')->where('action', 'review_pod')->delete();

        DB::statement('ALTER TABLE audit_access_logs DROP CONSTRAINT audit_access_logs_action_check');
        DB::statement("ALTER TABLE audit_access_logs ADD CONSTRAINT audit_access_logs_action_check CHECK (action IN (
            'view', 'export', 'close_case'))");
    }
};
