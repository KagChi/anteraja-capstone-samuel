<?php

namespace App\Support\Health;

use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Reports whether Redis is part of the active configuration and, if so,
 * whether it answers a PING. Redis is optional, so an unconfigured app is
 * healthy rather than degraded.
 */
final class RedisHealth
{
    public static function isConfigured(): bool
    {
        return self::cacheUsesRedis()
            || config('queue.default') === 'redis'
            || config('session.driver') === 'redis';
    }

    /**
     * @return array{status: string, latency_ms?: float, error?: string}
     */
    public static function check(): array
    {
        if (! self::isConfigured()) {
            return ['status' => 'not_configured'];
        }

        $startedAt = microtime(true);

        try {
            Redis::connection()->ping();

            return [
                'status' => 'up',
                'latency_ms' => round((microtime(true) - $startedAt) * 1000, 2),
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'down',
                'error' => $e->getMessage(),
            ];
        }
    }

    private static function cacheUsesRedis(): bool
    {
        $store = config('cache.default');

        return config("cache.stores.{$store}.driver") === 'redis';
    }
}
