<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\ProposeMeetingPointRequest;
use App\Services\Delivery\MeetingPointService;
use App\Support\Presentation\MeetingPointPresenter;
use Illuminate\Http\JsonResponse;

class MeetingPointController extends CourierController
{
    public function store(string $tracking, ProposeMeetingPointRequest $request, MeetingPointService $meetingPoints): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $meeting = $meetingPoints->propose($shipment, $this->courier(), $request->validated());
        $meeting->setRelation('shipment', $shipment);

        return $this->ok(MeetingPointPresenter::row($meeting), 201);
    }
}
