<?php

namespace App\Services\Delivery;

use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\Shipment;
use App\Services\Geofence\GeofenceService;
use App\Services\Verification\FakeGpsDetector;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Finalises a delivery (FR-01-06/07): geofence + PIN + POD must all pass,
 * unless an admin-approved exception covers an out-of-radius drop-off.
 */
class DeliveryCompletionService
{
    public function __construct(
        private readonly GeofenceService $geofence,
        private readonly FakeGpsDetector $fakeGps,
    ) {}

    /**
     * @return array{status: string, distance_m: int, inside: bool, exception_used: bool, pin_required: bool}
     */
    public function complete(Shipment $shipment, Courier $courier, float $latitude, float $longitude, array $signals = []): array
    {
        // FRD-06: the completion gate runs before anything is recorded, so a
        // blocked attempt never produces an `arrived` event; an approved
        // review request lets the delivery through and stays on the audit
        // trail as the override.
        $gps = $this->fakeGps->guard($shipment, $courier, $latitude, $longitude, $signals);

        $evaluation = $this->geofence->evaluate($shipment, $latitude, $longitude);
        $this->geofence->record($shipment, $courier, $latitude, $longitude, $evaluation, 'arrived');

        $recordedException = $shipment->deliveryExceptions
            ->sortByDesc('created_at')
            ->first();
        $outside = ! $evaluation['inside'];

        // Outside the radius the courier must have recorded a reason. The
        // admin still reviews it, but the delivery is not blocked until that
        // decision lands.
        if ($outside && $recordedException === null) {
            abort(422, 'Titik serah terima di luar radius geofence. Kirim alasan pengecualian terlebih dahulu.');
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
            // Persist the instant as UTC so the audit trail lines up with the
            // POD captured_at written by ProofService.
            'delivered_at' => Date::now()->utc(),
        ]);

        if ($outside) {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'exception_used'],
                [
                    'weight' => 0.50,
                    'details' => [
                        'exception' => $recordedException?->id,
                        'status' => $recordedException?->status,
                    ],
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
                'checks' => $outside
                    ? ['exception', 'pod']
                    : array_values(array_filter(['geofence', $shipment->pin_required ? 'pin' : null, 'pod'])),
                ...($gps['assessment']['level'] !== 'clean'
                    ? ['gps' => ['level' => $gps['assessment']['level'], 'override_id' => $gps['override_id']]]
                    : []),
            ],
        ]);

        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return [
            'status' => 'delivered',
            'distance_m' => $evaluation['distance_m'],
            'inside' => $evaluation['inside'],
            'exception_used' => $outside && $recordedException !== null,
            'pin_required' => (bool) $shipment->pin_required,
        ];
    }
}
