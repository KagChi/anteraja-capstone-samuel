<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION fn_distance_to_destination(
              p_shipment_id uuid,
              p_latitude    double precision,
              p_longitude   double precision
            ) RETURNS integer
            LANGUAGE sql STABLE AS $$
              SELECT round(
                       ST_Distance(
                         s.destination,
                         ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
                       )
                     )::integer
              FROM shipments s
              WHERE s.id = p_shipment_id;
            $$;
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION fn_evaluate_geofence(
              p_shipment_id uuid,
              p_latitude    double precision,
              p_longitude   double precision
            ) RETURNS TABLE (distance_m integer, radius_m integer, inside boolean)
            LANGUAGE sql STABLE AS $$
              SELECT
                round(ST_Distance(g.center,
                  ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography))::integer,
                g.radius_m,
                ST_Distance(g.center,
                  ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) <= g.radius_m
              FROM geofences g
              WHERE g.shipment_id = p_shipment_id AND g.is_active
              ORDER BY g.created_at DESC
              LIMIT 1;
            $$;
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS fn_evaluate_geofence(uuid, double precision, double precision)');
        DB::statement('DROP FUNCTION IF EXISTS fn_distance_to_destination(uuid, double precision, double precision)');
    }
};
