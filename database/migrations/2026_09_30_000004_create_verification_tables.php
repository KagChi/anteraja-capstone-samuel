<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_proofs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id');
            $table->uuid('courier_id');
            $table->text('photo_path');
            $table->geography('point', 'point', 4326);
            $table->integer('distance_to_destination_m');
            $table->timestampTz('captured_at')->useCurrent();
            $table->timestampTz('device_captured_at')->nullable();
            $table->text('watermark_hash');
            $table->text('watermark_address')->nullable();
            $table->text('recipient_name');
            $table->string('review_status')->default('valid');
            $table->text('review_note')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('courier_id')->references('id')->on('couriers')->restrictOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement('ALTER TABLE delivery_proofs ADD CONSTRAINT delivery_proofs_distance_to_destination_m_check CHECK (distance_to_destination_m >= 0)');
        DB::statement("ALTER TABLE delivery_proofs ADD CONSTRAINT delivery_proofs_review_status_check CHECK (review_status IN ('valid', 'needs_review', 'invalid'))");
        DB::statement("CREATE UNIQUE INDEX ux_proofs_one_valid ON delivery_proofs (shipment_id) WHERE review_status = 'valid'");
        DB::statement('CREATE INDEX ix_delivery_proofs_shipment ON delivery_proofs (shipment_id)');
        DB::statement('CREATE INDEX ix_delivery_proofs_point_gist ON delivery_proofs USING gist (point)');

        Schema::create('pin_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('shipment_id')->unique();
            $table->uuid('recipient_id');
            $table->text('code_hash');
            $table->integer('attempts')->default(0);
            $table->integer('max_attempts')->default(3);
            $table->integer('resend_count')->default(0);
            $table->string('status')->default('pending');
            $table->timestampTz('expires_at');
            $table->timestampTz('verified_at')->nullable();
            $table->timestampTz('locked_at')->nullable();
            $table->uuid('override_by')->nullable();
            $table->text('override_reason')->nullable();
            $table->timestampTz('override_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->foreign('recipient_id')->references('id')->on('recipients')->restrictOnDelete();
            $table->foreign('override_by')->references('id')->on('admins')->nullOnDelete();
        });

        DB::statement('ALTER TABLE pin_challenges ADD CONSTRAINT pin_challenges_attempts_check CHECK (attempts >= 0)');
        DB::statement('ALTER TABLE pin_challenges ADD CONSTRAINT pin_challenges_max_attempts_check CHECK (max_attempts > 0)');
        DB::statement('ALTER TABLE pin_challenges ADD CONSTRAINT pin_challenges_resend_count_check CHECK (resend_count >= 0)');
        DB::statement("ALTER TABLE pin_challenges ADD CONSTRAINT pin_challenges_status_check CHECK (status IN ('pending', 'verified', 'locked', 'expired', 'override'))");

        Schema::create('pin_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('pin_challenge_id');
            $table->string('channel');
            $table->text('destination');
            $table->integer('attempt_no')->default(1);
            $table->string('status')->default('sent');
            $table->text('provider_message_id')->nullable();
            $table->timestampTz('sent_at')->useCurrent();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('pin_challenge_id')->references('id')->on('pin_challenges')->cascadeOnDelete();
        });

        DB::statement("ALTER TABLE pin_deliveries ADD CONSTRAINT pin_deliveries_channel_check CHECK (channel IN ('email', 'sms', 'whatsapp'))");
        DB::statement('ALTER TABLE pin_deliveries ADD CONSTRAINT pin_deliveries_attempt_no_check CHECK (attempt_no > 0)');
        DB::statement("ALTER TABLE pin_deliveries ADD CONSTRAINT pin_deliveries_status_check CHECK (status IN ('queued', 'sent', 'delivered', 'failed'))");
        DB::statement('CREATE INDEX ix_pin_deliveries_challenge ON pin_deliveries (pin_challenge_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('pin_deliveries');
        Schema::dropIfExists('pin_challenges');
        Schema::dropIfExists('delivery_proofs');
    }
};
