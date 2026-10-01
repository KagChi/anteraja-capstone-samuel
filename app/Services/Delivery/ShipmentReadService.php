<?php

namespace App\Services\Delivery;

use App\Models\Shipment;
use App\Support\Presentation\DeliveryPresenter;

/**
 * Owns the cached shipment/task presentation payloads so both the HTTP
 * controllers and the cache-warming command build them the same way.
 */
class ShipmentReadService
{
    public const DEFAULT_INDEX_PER_PAGE = 200;

    public const DEFAULT_TASKS_PER_PAGE = 100;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function index(int $perPage): array
    {
        return ShipmentCache::remember("index.{$perPage}", function () use ($perPage): array {
            return Shipment::query()
                ->forListPresentation()
                ->orderByDesc('shipments.created_at')
                ->limit($perPage)
                ->get()
                ->map(fn (object $shipment) => DeliveryPresenter::rowFromList($shipment))
                ->values()
                ->all();
        });
    }

    /**
     * @return array{shipment: array<string, mixed>, detail: array<string, mixed>}
     */
    public function show(string $id): array
    {
        return ShipmentCache::remember("show.{$id}", function () use ($id): array {
            $shipment = Shipment::query()
                ->withPresentation()
                ->withDestinationCoordinates()
                ->findOrFail($id);

            return [
                'shipment' => DeliveryPresenter::row($shipment),
                'detail' => DeliveryPresenter::detail($shipment),
            ];
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function tasks(string $courierId, int $perPage): array
    {
        return ShipmentCache::remember("tasks.{$courierId}.{$perPage}", function () use ($courierId, $perPage): array {
            return Shipment::withPresentation()
                ->withDestinationCoordinates()
                ->where('courier_id', $courierId)
                ->whereIn('status', ['pending', 'picked_up', 'in_transit'])
                ->orderBy('created_at')
                ->limit($perPage)
                ->get()
                ->map(fn (Shipment $shipment) => DeliveryPresenter::task($shipment))
                ->values()
                ->all();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function task(string $id): array
    {
        return ShipmentCache::remember("task.{$id}", function () use ($id): array {
            $shipment = Shipment::query()
                ->withPresentation()
                ->withDestinationCoordinates()
                ->findOrFail($id);

            return DeliveryPresenter::task($shipment);
        });
    }
}
