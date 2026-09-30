<?php

namespace App\Support\Geo;

/**
 * Distance helpers used when PostGIS is not the source of truth
 * (e.g. estimating distance from stored lat/lng pairs).
 */
class Distance
{
    private const EARTH_RADIUS_M = 6371000.0;

    public static function haversineMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
    ): int {
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;

        return (int) round(self::EARTH_RADIUS_M * 2 * asin(min(1.0, sqrt($a))));
    }

    public static function label(int $meters): string
    {
        if ($meters < 1000) {
            return $meters.' m';
        }

        return rtrim(rtrim(number_format($meters / 1000, 1, ',', '.'), '0'), ',').' km';
    }
}
