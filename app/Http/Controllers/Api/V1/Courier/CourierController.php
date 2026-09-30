<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\Shipment;
use App\Support\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;

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
        $shipment = Shipment::query()
            ->where(function ($query) use ($key) {
                $query->where('id', $key)->orWhere('tracking_number', $key);
            })
            ->where('courier_id', $this->courier()->id)
            ->withPresentation()
            ->first();

        if (! $shipment) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$key]);
        }

        return $shipment;
    }
}
