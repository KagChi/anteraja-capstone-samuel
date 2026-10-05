<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\VerifyPinRequest;
use App\Services\Verification\PinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PinController extends CourierController
{
    public function store(string $tracking, Request $request, PinService $pins): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $result = $pins->issue($shipment, $request->boolean('resend'));

        $resendLimit = PinService::resendLimit($shipment);
        $resendCount = (int) $result['challenge']->resend_count;

        $payload = [
            'status' => $result['challenge']->status,
            'expires_at' => $result['challenge']->expires_at?->toIso8601String(),
            'channel' => 'email',
            'destination' => $shipment->recipient?->email,
            'attempts' => $result['challenge']->attempts,
            'max_attempts' => $result['challenge']->max_attempts,
            'resend_count' => $resendCount,
            'resend_limit' => $resendLimit,
            'can_resend' => $resendCount < $resendLimit,
        ];

        // Demo prototype: the PIN is a fixed, published code (see PinService),
        // so the courier hint can always show it.
        $payload['debug_code'] = $result['code'];

        return $this->ok($payload, 201);
    }

    public function verify(string $tracking, VerifyPinRequest $request, PinService $pins): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $result = $pins->verify($shipment, $this->courier(), (string) $request->input('code'));

        return $this->ok([
            'verified' => $result['status'] === 'verified',
        ] + $result);
    }
}
