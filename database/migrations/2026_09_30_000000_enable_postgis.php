<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION fn_touch_updated_at()
            RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
              NEW.updated_at := now();
              RETURN NEW;
            END;
            $$;
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS fn_touch_updated_at()');
    }
};
