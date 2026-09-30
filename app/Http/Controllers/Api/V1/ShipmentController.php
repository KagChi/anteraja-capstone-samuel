<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Services\Audit\AuditService;
use App\Support\Auth;
use App\Support\Presentation\DeliveryPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ShipmentController extends Controller
{
    use RespondsWithEnvelope;

    public function index(): JsonResponse
    {
        $rows = Shipment::withPresentation()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Shipment $shipment) => DeliveryPresenter::row($shipment))
            ->values()
            ->all();

        return $this->ok($rows, 200, ['total' => count($rows)]);
    }

    public function show(string $key, AuditService $audit): JsonResponse
    {
        $shipment = $this->find($key);
        $admin = Auth::getCurrentAdmin();
        $courier = Auth::getCurrentCourier();
        $actor = $admin ?? $courier;

        if ($actor) {
            $audit->log(
                'view',
                $admin ? 'admin' : 'courier',
                $actor['id'],
                $shipment->id,
                ['page' => '/api/v1/shipments/'.$key],
            );
        }

        return $this->ok([
            'shipment' => DeliveryPresenter::row($shipment),
            'detail' => DeliveryPresenter::detail($shipment),
        ]);
    }

    private function find(string $key): Shipment
    {
        $shipment = Shipment::query()
            ->where(function ($query) use ($key) {
                if (Str::isUuid($key)) {
                    $query->where('id', $key)->orWhere('tracking_number', $key);
                } else {
                    $query->where('tracking_number', $key);
                }
            })
            ->withPresentation()
            ->withDestinationCoordinates()
            ->first();

        if (! $shipment) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$key]);
        }

        return $shipment;
    }
}
