<?php

namespace App\Http\Controllers\Api\V1\Courier;

use App\Models\Shipment;
use App\Support\Auth;
use App\Support\Date;
use App\Support\Geo\ServiceAreas;
use Illuminate\Http\JsonResponse;

/**
 * Courier identity, assignment area and shift counters for the Profil screen.
 */
class ProfileController extends CourierController
{
    public function __invoke(): JsonResponse
    {
        $courier = $this->courier();
        $courier->load('serviceArea');
        $area = ServiceAreas::fromCode($courier->serviceArea?->code);
        $startOfToday = Date::now()->startOfDay()->utc();

        $active = Shipment::query()
            ->where('courier_id', $courier->id)
            ->whereIn('status', ['pending', 'picked_up', 'in_transit'])
            ->count();

        return $this->ok([
            'name' => $courier->name,
            'code' => $courier->code,
            'phone' => $courier->phone,
            'email' => Auth::user()?->email,
            'active' => (bool) $courier->is_active,
            'serviceArea' => [
                'code' => $courier->serviceArea?->code,
                'label' => $area['label'],
                'region' => $area['region'],
            ],
            'stats' => [
                'activeTasks' => $active,
                'deliveredToday' => Shipment::query()
                    ->where('courier_id', $courier->id)
                    ->where('status', 'delivered')
                    ->where('delivered_at', '>=', $startOfToday)
                    ->count(),
                'deliveredTotal' => Shipment::query()
                    ->where('courier_id', $courier->id)
                    ->where('status', 'delivered')
                    ->count(),
            ],
        ]);
    }
}
