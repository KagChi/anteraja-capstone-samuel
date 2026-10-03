<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Deterministic demo weight (0.50-29.99 kg) derived from the tracking
     * number, so this migration and both seed scripts agree on every row.
     */
    private const WEIGHT_EXPRESSION = "round((0.50 + (abs(('x' || substr(md5(tracking_number), 1, 8))::bit(32)::int) % 2950) / 100.0)::numeric, 2)";

    public function up(): void
    {
        if (Schema::hasColumn('shipments', 'weight_kg')) {
            return;
        }

        Schema::table('shipments', function (Blueprint $table) {
            $table->decimal('weight_kg', 6, 2)->default(1.00);
        });

        DB::statement('ALTER TABLE shipments ADD CONSTRAINT shipments_weight_kg_check CHECK (weight_kg > 0)');

        DB::statement('UPDATE shipments SET weight_kg = '.self::WEIGHT_EXPRESSION);
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('weight_kg');
        });
    }
};
