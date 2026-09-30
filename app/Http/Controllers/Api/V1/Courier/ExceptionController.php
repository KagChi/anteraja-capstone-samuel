<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\StoreExceptionRequest;
use App\Services\Delivery\ExceptionService;
use App\Support\Presentation\ExceptionPresenter;
use Illuminate\Http\JsonResponse;

class ExceptionController extends CourierController
{
    public function store(string $tracking, StoreExceptionRequest $request, ExceptionService $exceptions): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $exception = $exceptions->request(
            $shipment,
            $this->courier(),
            (float) $request->input('latitude'),
            (float) $request->input('longitude'),
            (string) $request->input('reason'),
        );

        $exception->setRelation('shipment', $shipment);

        return $this->ok(ExceptionPresenter::detail($exception), 201);
    }
}
