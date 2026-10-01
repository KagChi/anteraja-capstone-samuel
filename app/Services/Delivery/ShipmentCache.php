<?php

namespace App\Services\Delivery;

use App\Support\CacheTtl;
use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Version-invalidated cache for the heavy shipment read endpoints.
 *
 * Remote Postgres makes the `withPresentation()` eager-load fan-out the
 * dominant cost, so list/detail payloads are cached and every write bumps a
 * version counter that namespaces the keys (no pattern deletes).
 */
class ShipmentCache
{
    private const VERSION_KEY = 'shipments.cache_version';

    public static function remember(string $suffix, Closure $callback): mixed
    {
        return Cache::remember(self::key($suffix), CacheTtl::seconds(), $callback);
    }

    public static function bump(): void
    {
        Cache::increment(self::VERSION_KEY);
    }

    private static function key(string $suffix): string
    {
        $version = (int) (Cache::get(self::VERSION_KEY) ?? 0);

        return "shipments.v{$version}.{$suffix}";
    }
}
