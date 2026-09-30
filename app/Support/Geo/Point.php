<?php

namespace App\Support\Geo;

use Illuminate\Support\Facades\DB;

/**
 * Helpers for reading/writing PostGIS `geography(Point,4326)` columns.
 *
 * Eloquent returns geography columns as raw EWKB hex, so lat/lng must be
 * projected explicitly with `ST_X` / `ST_Y`.
 */
class Point
{
    /**
     * SQL expression producing a geography point from WGS84 coordinates.
     */
    public static function make(float $latitude, float $longitude): string
    {
        return sprintf(
            'ST_SetSRID(ST_MakePoint(%F, %F), 4326)::geography',
            $longitude,
            $latitude,
        );
    }

    /**
     * @return array{0: string, 1: string} [latExpression, lngExpression]
     */
    public static function latLngExpression(string $column): array
    {
        return [
            sprintf('ST_Y(%s::geometry)', $column),
            sprintf('ST_X(%s::geometry)', $column),
        ];
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public static function parse(?string $ewkb): ?array
    {
        if ($ewkb === null || $ewkb === '') {
            return null;
        }

        $row = DB::selectOne(
            'SELECT ST_Y(?::geography::geometry) AS lat, ST_X(?::geography::geometry) AS lng',
            [$ewkb, $ewkb],
        );

        if ($row === null || $row->lat === null) {
            return null;
        }

        return ['latitude' => (float) $row->lat, 'longitude' => (float) $row->lng];
    }
}
