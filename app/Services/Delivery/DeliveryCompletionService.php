<?php

namespace App\Services\Delivery;

use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\Shipment;
use App\Services\Geofence\GeofenceService;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\DB;

/**
 * Finalises a delivery (FR-01-06/07): geofence + PIN + POD must all pass,
 * unless an admin-approved exception covers an out-of-radius drop-off.
 */
class DeliveryCompletionService
{
    public function __construct(private readonly GeofenceService $geofence) {}

    /**
     * @return array{status: string, distance_m: int, inside: bool, exception_used: bool, pin_required: bool}
     */
    public function complete(Shipment $shipment, Courier $courier, float $latitude, float $longitude): array
    {
        $evaluation = $this->geofence->evaluate($shipment, $latitude, $longitude);
        $this->geofence->record($shipment, $courier, $latitude, $longitude, $evaluation, 'arrived');

        $approvedException = $shipment->deliveryExceptions
            ->firstWhere('status', 'approved');

        if (! $evaluation['inside'] && ! $approvedException) {
            abort(422, 'Titik serah terima di luar radius geofence dan belum ada pengecualian yang disetujui.');
        }

        if ($shipment->pin_required) {
            $pin = $shipment->pinChallenge;

            if (! $pin || ! in_array($pin->status, ['verified', 'override'], true)) {
                abort(422, 'PIN penerima belum terverifikasi.');
            }
        }

        $hasProof = $shipment->deliveryProofs()->exists();

        if (! $hasProof) {
            abort(422, 'Bukti foto (POD) belum diambil.');
        }

        $shipment->update([
            'status' => 'delivered',
            'delivered_at' => Date::now(),
        ]);

        if ($approvedException) {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'exception_used'],
                [
                    'weight' => 0.50,
                    'details' => ['exception' => $approvedException->id],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );
        }

        DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'event_type' => 'delivered',
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_to_destination_m' => $evaluation['distance_m'],
            'actor_type' => 'system',
            'metadata' => [
                'checks' => $approvedException
                    ? ['exception', 'pod']
                    : array_values(array_filter(['geofence', $shipment->pin_required ? 'pin' : null, 'pod'])),
            ],
        ]);

        return [
            'status' => 'delivered',
            'distance_m' => $evaluation['distance_m'],
            'inside' => $evaluation['inside'],
            'exception_used' => (bool) $approvedException,
            'pin_required' => (bool) $shipment->pin_required,
        ];
    }
}
