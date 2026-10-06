<?php

namespace App\Console\Commands;

use App\Models\Courier;
use App\Models\DeliveryException;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ExceptionService;
use App\Services\Delivery\ShipmentReadService;
use App\Services\Radius\RadiusService;
use App\Support\CacheTtl;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Primes the presentation read caches so the first request after a restart is
 * served warm instead of paying the remote-Postgres round-trips.
 */
class WarmCache extends Command
{
    protected $signature = 'app:warm-cache';

    protected $description = 'Prime the cached shipment, dashboard and radius read payloads';

    public function handle(
        DashboardService $dashboard,
        RadiusService $radius,
        ShipmentReadService $shipments,
    ): int {
        $dashboard->summary();
        $radius->segments();
        $radius->meta();

        Cache::remember(
            ExceptionService::PENDING_COUNT_CACHE_KEY,
            CacheTtl::seconds(),
            fn () => DeliveryException::query()->where('status', 'pending')->count(),
        );

        $shipments->index(ShipmentReadService::DEFAULT_INDEX_PER_PAGE);
        $shipments->index(ShipmentReadService::UI_PER_PAGE);

        $couriers = Courier::query()->pluck('id');
        foreach ($couriers as $courierId) {
            $shipments->tasks($courierId, ShipmentReadService::DEFAULT_TASKS_PER_PAGE);
            $shipments->tasks($courierId, ShipmentReadService::UI_PER_PAGE);
        }

        $this->info(sprintf('Warmed read caches (%d courier task lists, two page sizes).', $couriers->count()));

        return self::SUCCESS;
    }
}
