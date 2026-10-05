<?php

namespace Database\Seeders;

use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AnterajaSeeder::class);
        $this->call(AuthUserSeeder::class);

        // Seeding replaces rows out of band, so the presentation caches that
        // were built from the previous dataset must be invalidated.
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();
    }
}
