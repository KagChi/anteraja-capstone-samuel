<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Models\Shipment;
use App\Support\CursorPage;
use App\Support\Presentation\DeliveryPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The courier's completed stops (delivered/failed) for the Riwayat screen.
 */
class HistoryController extends CourierController
{
    private const DEFAULT_PER_PAGE = 20;

    private const MAX_PER_PAGE = 100;

    public function __invoke(Request $request): JsonResponse
    {
        $courier = $this->courier();
        $perPage = min(max(1, $request->integer('per_page') ?: self::DEFAULT_PER_PAGE), self::MAX_PER_PAGE);

        $page = CursorPage::get(
            Shipment::query()
                ->where('courier_id', $courier->id)
                ->whereIn('status', ['delivered', 'failed'])
                ->with(['recipient', 'deliveryProofs', 'anomalyFlags'])
                ->orderByDesc('created_at')
                ->orderByDesc('id'),
            $perPage,
            $request->query('cursor'),
            'created_at',
            'id',
            'desc',
            fn (Shipment $shipment) => DeliveryPresenter::historyRow($shipment),
        );

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }
}
