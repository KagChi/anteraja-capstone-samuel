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
        $tasks = $shipments->tasks($courierId, $this->perPage($request));

        return $this->ok($tasks, 200, ['total' => count($tasks)]);
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
