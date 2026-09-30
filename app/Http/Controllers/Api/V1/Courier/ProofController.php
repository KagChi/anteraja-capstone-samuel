<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\StoreProofRequest;
use App\Services\Verification\ProofService;
use Illuminate\Http\JsonResponse;

class ProofController extends CourierController
{
    public function store(string $tracking, StoreProofRequest $request, ProofService $proofs): JsonResponse
    {
        $shipment = $this->shipment($tracking);

        $proof = $proofs->store($shipment, $this->courier(), $request->validated());

        return $this->ok([
            'id' => $proof->id,
            'review_status' => $proof->review_status,
            'distance_to_destination_m' => $proof->distance_to_destination_m,
            'photo_path' => $proof->photo_path,
            'captured_at' => $proof->captured_at?->toIso8601String(),
            'watermark_hash' => $proof->watermark_hash,
        ], 201);
    }
}
