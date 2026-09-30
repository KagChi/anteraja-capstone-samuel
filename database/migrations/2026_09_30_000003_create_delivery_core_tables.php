<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('tracking_number')->unique();
            $table->string('service_type');
            $table->uuid('courier_id')->nullable();
            $table->uuid('recipient_id');
            $table->uuid('service_area_id');
            $table->geography('origin', 'point', 4326);
            $table->geography('destination', 'point', 4326);
            $table->text('destination_address');
            $table->string('status')->default('pending');
            $table->boolean('pin_required')->default(false);
            $table->integer('cod_amount')->default(0);
            $table->timestampTz('delivered_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('courier_id')->references('id')->on('couriers')->nullOnDelete();
            $table->foreign('recipient_id')->references('id')->on('recipients')->restrictOnDelete();
            $table->foreign('service_area_id')->references('id')->on('service_areas')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE shipments ADD CONSTRAINT shipments_service_type_check CHECK (service_type IN ('instant', 'same_day', 'regular'))");
        DB::statement("ALTER TABLE shipments ADD CONSTRAINT shipments_status_check CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed'))");
        DB::statement('ALTER TABLE shipments ADD CONSTRAINT shipments_cod_amount_check CHECK (cod_amount >= 0)');

        Schema::create('geofences', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->geography('center', 'point', 4326);
            $table->integer('radius_m');
            $table->string('source')->default('destination');
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement('ALTER TABLE geofences ADD CONSTRAINT geofences_radius_m_check CHECK (radius_m > 0)');
        DB::statement("ALTER TABLE geofences ADD CONSTRAINT geofences_source_check CHECK (source IN ('destination', 'meeting_point'))");
        DB::statement('CREATE UNIQUE INDEX ux_geofences_one_active ON geofences (shipment_id) WHERE is_active');
        DB::statement('CREATE INDEX ix_geofences_center_gist ON geofences USING gist (center)');

        Schema::create('delivery_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->uuid('courier_id')->nullable();
            $table->string('event_type');
            $table->geography('point', 'point', 4326)->nullable();
            $table->integer('distance_to_destination_m')->nullable();
            $table->string('actor_type')->default('courier');
            $table->jsonb('metadata')->default('{}');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('courier_id')->references('id')->on('couriers')->nullOnDelete();
        });

        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_event_type_check CHECK (event_type IN (
            'pickup', 'arrived', 'delivery_attempt', 'delivered', 'failed',
            'pin_verification', 'geofence_check',
            'exception_requested', 'exception_decided',
            'meeting_point_proposed', 'meeting_point_approved',
            'pod_captured'))");
        DB::statement("ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_actor_type_check CHECK (actor_type IN ('courier', 'recipient', 'admin', 'system'))");
        DB::statement('ALTER TABLE delivery_events ADD CONSTRAINT delivery_events_distance_to_destination_m_check CHECK (distance_to_destination_m IS NULL OR distance_to_destination_m >= 0)');
        DB::statement('CREATE INDEX ix_delivery_events_shipment_created ON delivery_events (shipment_id, created_at)');
        DB::statement('CREATE INDEX ix_delivery_events_courier ON delivery_events (courier_id)');
        DB::statement('CREATE INDEX ix_delivery_events_point_gist ON delivery_events USING gist (point)');
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_events');
        Schema::dropIfExists('geofences');
        Schema::dropIfExists('shipments');
    }
};
