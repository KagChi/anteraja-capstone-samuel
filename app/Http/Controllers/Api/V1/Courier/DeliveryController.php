<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\CompleteDeliveryRequest;
use App\Services\Delivery\DeliveryCompletionService;
use Illuminate\Http\JsonResponse;

class DeliveryController extends CourierController
{
    public function complete(string $tracking, CompleteDeliveryRequest $request, DeliveryCompletionService $completion): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $result = $completion->complete(
            $shipment,
            $this->courier(),
            (float) $request->input('latitude'),
            (float) $request->input('longitude'),
            $request->validated(),
        );

        return $this->ok($result);
    }
}
