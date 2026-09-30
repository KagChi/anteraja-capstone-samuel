<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_cases', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->string('case_number')->unique();
            $table->uuid('opened_by');
            $table->string('status')->default('open');
            $table->text('summary');
            $table->text('resolution')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('opened_by')->references('id')->on('admins')->restrictOnDelete();
            $table->foreign('closed_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement("ALTER TABLE claim_cases ADD CONSTRAINT claim_cases_status_check CHECK (status IN ('open', 'investigating', 'closed'))");

        Schema::create('claim_findings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('claim_case_id');
            $table->uuid('admin_id');
            $table->text('finding');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('claim_case_id')->references('id')->on('claim_cases')->cascadeOnDelete();
            $table->foreign('admin_id')->references('id')->on('admins')->restrictOnDelete();
        });

        DB::statement('CREATE INDEX ix_claim_findings_case ON claim_findings (claim_case_id)');

        Schema::create('anomaly_flags', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->string('flag_type');
            $table->decimal('weight', 4, 2)->default(1.00);
            $table->jsonb('details')->default('{}');
            $table->timestampTz('detected_at')->useCurrent();
            $table->boolean('is_resolved')->default(false);

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->unique(['shipment_id', 'flag_type']);
        });

        DB::statement("ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_flag_type_check CHECK (flag_type IN (
            'out_of_radius', 'device_time_mismatch', 'repeated_pin_failure',
            'pod_needs_review', 'exception_used'))");
        DB::statement('ALTER TABLE anomaly_flags ADD CONSTRAINT anomaly_flags_weight_check CHECK (weight >= 0)');
        DB::statement('CREATE INDEX ix_anomaly_flags_shipment ON anomaly_flags (shipment_id)');

        Schema::create('audit_access_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('actor_type')->default('admin');
            $table->uuid('actor_id');
            $table->uuid('shipment_id');
            $table->string('action');
            $table->jsonb('context')->default('{}');
            $table->timestampTz('accessed_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
        });

        DB::statement("ALTER TABLE audit_access_logs ADD CONSTRAINT audit_access_logs_actor_type_check CHECK (actor_type IN ('admin', 'courier'))");
        DB::statement("ALTER TABLE audit_access_logs ADD CONSTRAINT audit_access_logs_action_check CHECK (action IN ('view', 'export', 'close_case'))");
        DB::statement('CREATE INDEX ix_audit_access_logs_shipment ON audit_access_logs (shipment_id)');
        DB::statement('CREATE INDEX ix_audit_access_logs_actor ON audit_access_logs (actor_id)');

        Schema::create('admin_actions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('admin_id');
            $table->string('action_type');
            $table->string('target_type');
            $table->uuid('target_id');
            $table->text('reason')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('admin_id')->references('id')->on('admins')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check CHECK (action_type IN (
            'approve_exception', 'reject_exception', 'unlock_pin', 'override_pin',
            'set_meeting_point', 'close_claim', 'update_radius', 'review_pod'))");
        DB::statement("ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_target_type_check CHECK (target_type IN (
            'shipment', 'delivery_exception', 'pin_challenge', 'meeting_point',
            'claim_case', 'geofence_policy', 'delivery_proof'))");
        DB::statement('CREATE INDEX ix_admin_actions_target ON admin_actions (target_type, target_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_actions');
        Schema::dropIfExists('audit_access_logs');
        Schema::dropIfExists('anomaly_flags');
        Schema::dropIfExists('claim_findings');
        Schema::dropIfExists('claim_cases');
    }
};
