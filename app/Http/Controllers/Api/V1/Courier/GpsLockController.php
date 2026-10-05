<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\StoreGpsLockRequest;
use App\Services\Verification\GpsLockService;
use App\Support\Presentation\GpsLockPresenter;
use Illuminate\Http\JsonResponse;

class GpsLockController extends CourierController
{
    public function store(string $tracking, StoreGpsLockRequest $request, GpsLockService $locks): JsonResponse
    {
        $shipment = $this->shipment($tracking);
        $courier = $this->courier();

        $lock = $locks->request($shipment, $courier, $request->validated());
        $lock->setRelation('shipment', $shipment);
        $lock->setRelation('courier', $courier);

        return $this->ok(GpsLockPresenter::detail($lock), 201);
    }
}
