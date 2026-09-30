<?php

namespace App\Services\Geofence;

use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\Shipment;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\DB;

/**
 * Server-side geofence evaluation (FRD-01). The client never decides.
 */
class GeofenceService
{
    /**
     * @return array{distance_m: int, radius_m: int|null, inside: bool}
     */
    public function evaluate(Shipment $shipment, float $latitude, float $longitude): array
    {
        $row = DB::selectOne(
            'SELECT distance_m, radius_m, inside FROM fn_evaluate_geofence(?, ?, ?)',
            [$shipment->id, $latitude, $longitude],
        );

        if ($row === null) {
            return [
                'distance_m' => $this->distanceToDestination($shipment, $latitude, $longitude),
                'radius_m' => null,
                'inside' => false,
            ];
        }

        return [
            'distance_m' => (int) $row->distance_m,
            'radius_m' => $row->radius_m !== null ? (int) $row->radius_m : null,
            'inside' => $this->truthy($row->inside),
        ];
    }

    public function distanceToDestination(Shipment $shipment, float $latitude, float $longitude): int
    {
        $row = DB::selectOne(
            'SELECT fn_distance_to_destination(?, ?, ?) AS distance',
            [$shipment->id, $latitude, $longitude],
        );

        return (int) ($row->distance ?? 0);
    }

    /**
     * @param  array{distance_m: int, radius_m: int|null, inside: bool}  $result
     */
    public function record(
        Shipment $shipment,
        ?Courier $courier,
        float $latitude,
        float $longitude,
        array $result,
        string $eventType = 'geofence_check',
    ): DeliveryEvent {
        return DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier?->id,
            'event_type' => $eventType,
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_to_destination_m' => $result['distance_m'],
            'actor_type' => 'courier',
            'metadata' => [
                'inside' => $result['inside'],
                'radius_m' => $result['radius_m'],
            ],
        ]);
    }

    private function truthy(mixed $value): bool
    {
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }
}
