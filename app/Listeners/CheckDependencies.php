<?php

namespace App\Listeners;

use App\Support\Health\RedisHealth;
use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * Runs on the framework's `DiagnosingHealth` event (dispatched by the `/up`
 * route). Pings the database, and Redis only when it is actually configured,
 * so the endpoint is a truthful readiness probe under either setup.
 */
class CheckDependencies
{
    public function handle(DiagnosingHealth $event): void
    {
        DB::connection()->getPdo();

        if (RedisHealth::isConfigured()) {
            Redis::connection()->ping();
        }
    }
}
