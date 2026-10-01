<?php

namespace Tests\Feature\Console;

use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ExceptionService;
use App\Services\Radius\RadiusService;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class WarmCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
        Cache::flush();
    }

    public function test_warm_cache_fills_the_read_caches(): void
    {
        $this->artisan('app:warm-cache')->assertSuccessful();

        $this->assertTrue(Cache::has(DashboardService::CACHE_KEY));
        $this->assertTrue(Cache::has(RadiusService::SEGMENTS_CACHE_KEY));
        $this->assertTrue(Cache::has(RadiusService::META_CACHE_KEY));
        $this->assertTrue(Cache::has(ExceptionService::PENDING_COUNT_CACHE_KEY));
    }
}
