<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->uuid('courier_id');
            $table->uuid('event_id')->nullable();
            $table->geography('requested_point', 'point', 4326);
            $table->integer('distance_m');
            $table->integer('radius_m');
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->uuid('reviewed_by')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('courier_id')->references('id')->on('couriers')->restrictOnDelete();
            $table->foreign('event_id')->references('id')->on('delivery_events')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement('ALTER TABLE delivery_exceptions ADD CONSTRAINT delivery_exceptions_distance_m_check CHECK (distance_m >= 0)');
        DB::statement('ALTER TABLE delivery_exceptions ADD CONSTRAINT delivery_exceptions_radius_m_check CHECK (radius_m > 0)');
        DB::statement("ALTER TABLE delivery_exceptions ADD CONSTRAINT delivery_exceptions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))");
        DB::statement("CREATE UNIQUE INDEX ux_exceptions_one_pending ON delivery_exceptions (shipment_id) WHERE status = 'pending'");
        DB::statement('CREATE INDEX ix_delivery_exceptions_shipment ON delivery_exceptions (shipment_id)');

        Schema::create('meeting_points', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->string('proposed_by_type');
            $table->uuid('proposed_by_id');
            $table->geography('proposed_point', 'point', 4326);
            $table->integer('distance_from_destination_m');
            $table->integer('distance_from_buyer_m')->nullable();
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
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_points');
        Schema::dropIfExists('delivery_exceptions');
    }
};
