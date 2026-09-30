<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AnterajaSeeder extends Seeder
{
    /**
     * Seed the delivery-integrity domain from the canonical sample dataset
     * (mirrors docs/db/seed.sql). Re-runnable: the script truncates domain
     * tables before inserting.
     */
    public function run(): void
    {
        $path = database_path('seeders/sql/anteraja_seed.sql');

        DB::unprepared(file_get_contents($path));
    }
}
