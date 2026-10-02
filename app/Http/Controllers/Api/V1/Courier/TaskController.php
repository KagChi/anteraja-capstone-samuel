<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Services\Delivery\ShipmentReadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends CourierController
{
    private const MAX_PER_PAGE = 300;

    public function index(Request $request, ShipmentReadService $shipments): JsonResponse
    {
        $courierId = $this->courier()->id;
        $perPage = $this->perPage($request);

        $page = $shipments->tasksPage($courierId, $perPage, $request->query('cursor'));

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        if ($requested < 1) {
            return ShipmentReadService::DEFAULT_TASKS_PER_PAGE;
        }

        return min($requested, self::MAX_PER_PAGE);
    }

    public function show(string $tracking, ShipmentReadService $shipments): JsonResponse
    {
        return $this->ok($shipments->task($this->shipmentId($tracking)));
    }
}
