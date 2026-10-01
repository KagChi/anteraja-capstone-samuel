<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX IF NOT EXISTS ix_shipments_courier ON shipments (courier_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS ix_shipments_status ON shipments (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS ix_shipments_created ON shipments (created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS ix_shipments_courier_status ON shipments (courier_id, status)');
        DB::statement('CREATE INDEX IF NOT EXISTS ix_delivery_exceptions_status ON delivery_exceptions (status)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS ix_shipments_courier');
        DB::statement('DROP INDEX IF EXISTS ix_shipments_status');
        DB::statement('DROP INDEX IF EXISTS ix_shipments_created');
        DB::statement('DROP INDEX IF EXISTS ix_shipments_courier_status');
        DB::statement('DROP INDEX IF EXISTS ix_delivery_exceptions_status');
    }
};
