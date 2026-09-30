<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'service_areas', 'admins', 'geofence_policies', 'couriers', 'recipients',
        'shipments', 'geofences', 'pin_challenges', 'delivery_exceptions',
        'meeting_points', 'claim_cases',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("DROP TRIGGER IF EXISTS trg_touch_updated_at ON {$table}");
            DB::statement(
                "CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON {$table}
                 FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at()"
            );
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("DROP TRIGGER IF EXISTS trg_touch_updated_at ON {$table}");
        }
    }
};
