<?php

namespace App\Services\Verification;

use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\DeliveryProof;
use App\Models\Shipment;
use App\Services\Geofence\GeofenceService;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Proof-of-delivery capture (FRD-02): geotag, watermark hash and
 * server-side distance. Photos outside radius / with device-clock
 * mismatch are flagged `needs_review`.
 */
class ProofService
{
    public function __construct(private readonly GeofenceService $geofence) {}

    /**
     * @param  array{latitude: float, longitude: float, device_captured_at?: string|null, recipient_name: string, relation?: string|null, photo?: UploadedFile|null}  $data
     */
    public function store(Shipment $shipment, Courier $courier, array $data): DeliveryProof
    {
        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];
        $distance = $this->geofence->distanceToDestination($shipment, $latitude, $longitude);
        $radius = $shipment->activeGeofence?->radius_m;

        $capturedAt = Date::now();
        $deviceCapturedAt = isset($data['device_captured_at'])
            ? Date::jakarta($data['device_captured_at'])
            : null;

        $outOfRadius = $radius !== null && $distance > $radius;
        $deviceMismatch = $deviceCapturedAt !== null
            && abs($deviceCapturedAt->diffInMinutes($capturedAt)) > 15;

        $reviewStatus = $outOfRadius || $deviceMismatch ? 'needs_review' : 'valid';

        $photoPath = $data['photo'] instanceof UploadedFile
            ? $data['photo']->store('pod/'.$shipment->tracking_number, 'public')
            : 'pod/'.$shipment->tracking_number.'/pod.jpg';

        $proof = DeliveryProof::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'photo_path' => $photoPath,
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_to_destination_m' => $distance,
            'captured_at' => $capturedAt,
            'device_captured_at' => $deviceCapturedAt,
            'watermark_hash' => hash('sha256', $shipment->tracking_number.'|'.$capturedAt->toIso8601String()),
            'watermark_address' => $shipment->destination_address,
            'recipient_name' => $data['recipient_name'],
            'review_status' => $reviewStatus,
            'review_note' => $outOfRadius
                ? 'POD di luar radius geofence'
                : ($deviceMismatch ? 'Selisih waktu server/perangkat' : null),
        ]);

        DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'event_type' => 'pod_captured',
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_to_destination_m' => $distance,
            'actor_type' => 'courier',
        ]);

        if ($outOfRadius) {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'out_of_radius'],
                [
                    'weight' => 2.00,
                    'details' => ['distance_m' => $distance, 'radius_m' => $radius],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );
        }

        if ($deviceMismatch) {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'device_time_mismatch'],
                [
                    'weight' => 2.00,
                    'details' => [
                        'server' => $capturedAt->toIso8601String(),
                        'device' => $deviceCapturedAt?->toIso8601String(),
                    ],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );
        }

        if ($reviewStatus === 'needs_review') {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'pod_needs_review'],
                [
                    'weight' => 1.00,
                    'details' => ['proof' => $proof->id],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );
        }

        return $proof;
    }
}
