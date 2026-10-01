<?php

namespace App\Support;

/**
 * Shared TTL for the presentation read caches.
 */
final class CacheTtl
{
    public static function seconds(): int
    {
        return (int) config('performance.cache_ttl', 300);
    }
}
