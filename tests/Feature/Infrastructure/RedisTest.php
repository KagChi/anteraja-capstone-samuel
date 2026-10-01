<?php

namespace Tests\Feature\Infrastructure;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;
use Throwable;

/**
 * Verifies the optional Redis backend round-trips values and supports the
 * atomic increment the shipment read cache relies on. Skipped (not failed)
 * when Redis or phpredis is not available, so the default file-backed setup
 * keeps a green suite.
 */
#[Group('redis')]
class RedisTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        try {
            Redis::connection()->ping();
        } catch (Throwable $e) {
            $this->markTestSkipped('Redis is not available: '.$e->getMessage());
        }
    }

    public function test_redis_store_round_trips_values(): void
    {
        $store = Cache::store('redis');

        $store->put('tests:redis:key', 'value', 60);

        $this->assertSame('value', $store->get('tests:redis:key'));

        $store->forget('tests:redis:key');

        $this->assertFalse($store->has('tests:redis:key'));
    }

    public function test_redis_store_increments_atomically(): void
    {
        $store = Cache::store('redis');
        $key = 'tests:redis:counter';

        $store->forget($key);

        $this->assertSame(1, (int) $store->increment($key));
        $this->assertSame(2, (int) $store->increment($key));

        $store->forget($key);
    }
}
