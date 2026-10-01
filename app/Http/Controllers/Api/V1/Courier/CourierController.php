<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\Shipment;
use App\Support\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;

abstract class CourierController extends Controller
{
    use RespondsWithEnvelope;

    protected function courier(): Courier
    {
        $courier = Auth::courierModel();

        if (! $courier) {
            abort(403, 'Hanya kurir yang dapat mengakses sumber daya ini.');
        }

        return $courier;
    }

    protected function shipment(string $key): Shipment
    {
        return Shipment::query()
            ->withPresentation()
            ->withDestinationCoordinates()
            ->findOrFail($this->shipmentId($key));
    }

    /**
     * Resolves a tracking/id to a shipment the courier owns, with a single
     * cheap query so callers can cache the heavier presentation payload.
     */
    protected function shipmentId(string $key): string
    {
        $id = Shipment::query()
            ->where(function ($query) use ($key) {
                if (Str::isUuid($key)) {
                    $query->where('id', $key)->orWhere('tracking_number', $key);
                } else {
                    $query->where('tracking_number', $key);
                }
            })
            ->where('courier_id', $this->courier()->id)
            ->value('id');

        if (! $id) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$key]);
        }

        return $id;
    }
}
