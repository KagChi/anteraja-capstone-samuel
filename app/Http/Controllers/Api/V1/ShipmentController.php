<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Services\Audit\AuditService;
use App\Services\Delivery\ShipmentReadService;
use App\Support\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShipmentController extends Controller
{
    use RespondsWithEnvelope;

    private const MAX_PER_PAGE = 500;

    public function index(Request $request, ShipmentReadService $shipments): JsonResponse
    {
        $perPage = $this->perPage($request);
        $courier = Auth::getCurrentCourier();

        $page = $shipments->page($perPage, $request->query('cursor'), [
            'search' => $request->query('search'),
            'status' => $request->query('status'),
            'service' => $request->query('service'),
            'region' => $request->query('region'),
            'courier_id' => $courier['id'] ?? null,
        ]);

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        if ($requested < 1) {
            return ShipmentReadService::DEFAULT_INDEX_PER_PAGE;
        }

        return min($requested, self::MAX_PER_PAGE);
    }

    public function show(string $key, AuditService $audit, ShipmentReadService $shipments): JsonResponse
    {
        $shipmentId = $this->shipmentId($key);
        $admin = Auth::getCurrentAdmin();
        $courier = Auth::getCurrentCourier();
        $actor = $admin ?? $courier;

        // FR-05-10: a courier can only read the audit trail of shipments
        // assigned to them; other ids answer 404 instead of leaking existence.
        if (! $admin && $courier !== null
            && Shipment::whereKey($shipmentId)->where('courier_id', $courier['id'])->doesntExist()) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$key]);
        }

        if ($actor) {
            $audit->log(
                'view',
                $admin ? 'admin' : 'courier',
                $actor['id'],
                $shipmentId,
                ['page' => '/api/v1/shipments/'.$key],
            );
        }

        return $this->ok($shipments->show($shipmentId));
    }

    /**
     * Resolves an id/tracking to its shipment id with a single query so the
     * heavy presentation payload can be cached without re-hydrating relations.
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
