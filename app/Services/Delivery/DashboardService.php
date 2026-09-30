<?php

namespace App\Services\Delivery;

use App\Models\Shipment;
use App\Support\Presentation\DeliveryPresenter;

/**
 * Admin dashboard summary counts.
 */
class DashboardService
{
    /**
     * @return array{total: int, reviewCount: int, verifiedCount: int, shift: string}
     */
    public function summary(): array
    {
        $shipments = Shipment::withPresentation()->get();

        $review = 0;
        $verified = 0;

        foreach ($shipments as $shipment) {
            $flag = DeliveryPresenter::flag($shipment);

            if ($flag === 'delivered') {
                $verified++;
            } elseif ($flag === 'review') {
                $review++;
            }
        }

        return [
            'total' => $shipments->count(),
            'reviewCount' => $review,
            'verifiedCount' => $verified,
            'shift' => 'Shift Aktif (08:00 - 20:00)',
        ];
    }
}
