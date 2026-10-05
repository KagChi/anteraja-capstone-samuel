<?php

namespace App\Services\Delivery;

use App\Models\DeliveryProof;
use App\Models\Shipment;
use App\Support\Cursor;
use App\Support\CursorPage;
use App\Support\Presentation\DeliveryPresenter;
use App\Support\ProofMedia;

/**
 * Owns the cached shipment/task presentation payloads so both the HTTP
 * controllers and the cache-warming command build them the same way.
 */
class ShipmentReadService
{
    public const DEFAULT_INDEX_PER_PAGE = 200;

    public const DEFAULT_TASKS_PER_PAGE = 100;

    /**
     * Rows for the first page, kept for the cache-warming command and callers
     * that do not paginate.
     *
     * @return array<int, array<string, mixed>>
     */
    public function index(int $perPage): array
    {
        return $this->page($perPage, null)['rows'];
    }

    /**
     * Keyset ("cursor") page ordered by `created_at DESC, id DESC`.
     *
     * @return array{rows: array<int, array<string, mixed>>, next_cursor: string|null}
     */
    public function page(int $perPage, ?string $cursor): array
    {
        $decoded = Cursor::decode($cursor);
        $key = sprintf('index.%d.%s', $perPage, $decoded ? substr(sha1((string) $cursor), 0, 12) : 'first');

        return ShipmentCache::remember($key, fn (): array => CursorPage::get(
            Shipment::query()
                ->forListPresentation()
                ->orderByDesc('shipments.created_at')
                ->orderByDesc('shipments.id'),
            $perPage,
            $cursor,
            'shipments.created_at',
            'shipments.id',
            'desc',
            fn (object $shipment) => DeliveryPresenter::rowFromList($shipment),
        ));
    }

    /**
     * @return array{shipment: array<string, mixed>, detail: array<string, mixed>}
     */
    public function show(string $id): array
    {
        $payload = ShipmentCache::remember("show.{$id}", function () use ($id): array {
            $shipment = Shipment::query()
                ->withPresentation()
                ->withDestinationCoordinates()
                ->findOrFail($id);

            return [
                'shipment' => DeliveryPresenter::row($shipment),
                'detail' => DeliveryPresenter::detail($shipment),
            ];
        });

        // Signed POD URLs are short-lived and admin-only, so they are attached
        // per request instead of being cached with the shared payload.
        $payload['detail']['pod']['photoUrl'] = $this->podPhotoUrl($payload['detail']['pod']['id'] ?? null);

        return $payload;
    }

    private function podPhotoUrl(?string $proofId): ?string
    {
        if (! $proofId) {
            return null;
        }

        return ProofMedia::signedUrl(DeliveryProof::query()->find($proofId));
    }

    /**
     * Rows for the first task page (cache-warming command).
     *
     * @return array<int, array<string, mixed>>
     */
    public function tasks(string $courierId, int $perPage): array
    {
        return $this->tasksPage($courierId, $perPage, null)['rows'];
    }

    /**
     * Keyset ("cursor") page ordered by `created_at ASC, id ASC`.
     *
     * @return array{rows: array<int, array<string, mixed>>, next_cursor: string|null}
     */
    public function tasksPage(string $courierId, int $perPage, ?string $cursor): array
    {
        $decoded = Cursor::decode($cursor);
        $key = sprintf('tasks.%s.%d.%s', $courierId, $perPage, $decoded ? substr(sha1((string) $cursor), 0, 12) : 'first');

        return ShipmentCache::remember($key, fn (): array => CursorPage::get(
            Shipment::withPresentation()
                ->withDestinationCoordinates()
                ->where('courier_id', $courierId)
                ->whereIn('status', ['pending', 'picked_up', 'in_transit'])
                ->orderBy('created_at')
                ->orderBy('id'),
            $perPage,
            $cursor,
            'created_at',
            'id',
            'asc',
            fn (Shipment $shipment) => DeliveryPresenter::task($shipment),
        ));
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
