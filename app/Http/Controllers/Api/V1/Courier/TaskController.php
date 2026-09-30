<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Models\Shipment;
use App\Support\Presentation\DeliveryPresenter;
use Illuminate\Http\JsonResponse;

class TaskController extends CourierController
{
    public function index(): JsonResponse
    {
        $tasks = Shipment::withPresentation()
            ->withDestinationCoordinates()
            ->where('courier_id', $this->courier()->id)
            ->whereIn('status', ['pending', 'picked_up', 'in_transit'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (Shipment $shipment) => DeliveryPresenter::task($shipment))
            ->values()
            ->all();

        return $this->ok($tasks, 200, ['total' => count($tasks)]);
    }

    public function show(string $tracking): JsonResponse
    {
        return $this->ok(DeliveryPresenter::task($this->shipment($tracking)));
    }
}
