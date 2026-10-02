<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\CloseClaimCaseRequest;
use App\Models\Shipment;
use App\Services\Audit\ClaimCaseService;
use App\Support\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ClaimCaseController extends Controller
{
    use RespondsWithEnvelope;

    public function close(string $id, CloseClaimCaseRequest $request, ClaimCaseService $cases): JsonResponse
    {
        $shipment = Shipment::query()->findOrFail($this->shipmentId($id));
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat menutup kasus.');
        }

        $case = $cases->close(
            $shipment,
            $admin,
            (string) $request->input('decision'),
            $request->input('note'),
        );

        return $this->ok([
            'caseNumber' => $case->case_number,
            'status' => $case->status,
            'resolution' => $case->resolution,
        ]);
    }

    /**
     * Resolves an id/tracking to its shipment id (mirrors ShipmentController).
     */
    private function shipmentId(string $key): string
    {
        $id = Shipment::query()
            ->where(function ($query) use ($key) {
                if (Str::isUuid($key)) {
                    $query->where('id', $key)->orWhere('tracking_number', $key);
                } else {
                    $query->where('tracking_number', $key);
                }
            })
            ->value('id');

        if (! $id) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$key]);
        }

        return $id;
    }
}
