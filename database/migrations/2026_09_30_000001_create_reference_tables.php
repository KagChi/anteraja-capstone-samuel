<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_areas', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('code')->unique();
            $table->string('name');
            $table->string('city');
            $table->geography('center', 'point', 4326)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        Schema::create('admins', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name');
            $table->string('email')->unique();
            $table->string('role');
            $table->uuid('service_area_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('service_area_id')->references('id')->on('service_areas')->nullOnDelete();
        });

        Schema::create('geofence_policies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('service_type')->unique();
            $table->integer('default_radius_m');
            $table->boolean('requires_pin');
            $table->integer('sla_minutes')->nullable();
            $table->integer('pin_length')->default(6);
            $table->integer('pin_max_attempts')->default(3);
            $table->integer('pin_ttl_minutes')->default(15);
            $table->integer('pin_max_resends')->default(3);
            $table->string('protocol_version');
            $table->uuid('updated_by')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('updated_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement("ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('superadmin', 'ops_admin', 'cs_agent'))");
        DB::statement("ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_service_type_check CHECK (service_type IN ('instant', 'same_day', 'regular'))");
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_default_radius_m_check CHECK (default_radius_m > 0)');
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_sla_minutes_check CHECK (sla_minutes IS NULL OR sla_minutes > 0)');
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_pin_length_check CHECK (pin_length BETWEEN 4 AND 8)');
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_pin_max_attempts_check CHECK (pin_max_attempts > 0)');
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_pin_ttl_minutes_check CHECK (pin_ttl_minutes > 0)');
        DB::statement('ALTER TABLE geofence_policies ADD CONSTRAINT geofence_policies_pin_max_resends_check CHECK (pin_max_resends >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('geofence_policies');
        Schema::dropIfExists('admins');
        Schema::dropIfExists('service_areas');
    }
};
