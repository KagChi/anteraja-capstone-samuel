<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\ReviewProofRequest;
use App\Models\DeliveryProof;
use App\Services\Verification\ProofReviewService;
use App\Support\Auth;
use Illuminate\Http\JsonResponse;

class ProofReviewController extends Controller
{
    use RespondsWithEnvelope;

    public function review(string $proof, ReviewProofRequest $request, ProofReviewService $reviews): JsonResponse
    {
        $model = DeliveryProof::query()->findOrFail($proof);
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat meninjau bukti POD.');
        }

        $model = $reviews->review(
            $model,
            $admin,
            (string) $request->input('decision'),
            $request->input('note'),
        );

        return $this->ok([
            'id' => $model->id,
            'review_status' => $model->review_status,
            'review_note' => $model->review_note,
            'reviewed_at' => $model->reviewed_at?->toIso8601String(),
        ]);
    }
}
