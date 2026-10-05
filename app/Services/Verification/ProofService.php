<?php

namespace App\Services\Verification;

use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\DeliveryProof;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Services\Geofence\GeofenceService;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Proof-of-delivery capture (FRD-02): the courier's own GPS fix and in-app
 * camera photo are watermarked by the server (FR-02-04/05), stored as a
 * private object on the POD disk - S3 when POD_DISK=s3 (FR-02-06) - and
 * scored against the geofence radius and the device clock.
 */
class ProofService
{
    public function __construct(
        private readonly GeofenceService $geofence,
        private readonly ProofWatermark $watermark,
    ) {}

    /**
     * @param  array{latitude: float|string, longitude: float|string, device_captured_at?: string|null, recipient_name: string, relation?: string|null, photo?: UploadedFile|null}  $data
     */
    public function store(Shipment $shipment, Courier $courier, array $data): DeliveryProof
    {
        $photo = $data['photo'] ?? null;

        // FR-02-01/02: a POD attempt is only a camera capture taken by the
        // courier app; there is no gallery path.
        if (! $photo instanceof UploadedFile) {
            abort(422, 'Foto bukti (POD) wajib diambil dari kamera aplikasi.');
        }

        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];
        $distance = $this->geofence->distanceToDestination($shipment, $latitude, $longitude);
        $radius = $shipment->activeGeofence?->radius_m;

        $capturedAt = Date::now();
        $capturedAtUtc = $capturedAt->copy()->utc();

        $deviceCapturedAt = isset($data['device_captured_at'])
            ? Date::jakarta($data['device_captured_at'])
            : null;
        $deviceCapturedAtUtc = $deviceCapturedAt?->copy()->utc();

        $outOfRadius = $radius !== null && $distance > $radius;
        $deviceMismatch = $deviceCapturedAtUtc !== null
            && abs($deviceCapturedAtUtc->diffInMinutes($capturedAtUtc)) > 15;

        $reviewStatus = $outOfRadius || $deviceMismatch ? 'needs_review' : 'valid';
        $address = (string) ($shipment->destination_address ?? '');
        $recipient = (string) $data['recipient_name'];
        $relation = isset($data['relation']) && $data['relation'] !== ''
            ? (string) $data['relation']
            : null;

        $binary = file_get_contents($photo->getRealPath());

        if ($binary === false) {
            abort(422, 'Foto POD tidak dapat dibaca.');
        }

        $watermarked = $this->watermark->apply(
            $binary,
            $shipment->tracking_number,
            $latitude,
            $longitude,
            $address,
            $recipient,
            $capturedAt,
        );

        $path = sprintf('pod/%s/%s.jpg', $shipment->tracking_number, (string) Str::ulid());
        Storage::disk('pod')->put($path, $watermarked, ['visibility' => 'private']);

        $proof = DB::transaction(function () use (
            $shipment,
            $courier,
            $path,
            $latitude,
            $longitude,
            $distance,
            $radius,
            $capturedAtUtc,
            $deviceCapturedAtUtc,
            $address,
            $recipient,
            $relation,
            $reviewStatus,
            $outOfRadius,
            $deviceMismatch,
        ): DeliveryProof {
            // FRD-02 business rule: several attempts may exist, but only one
            // proof per shipment stays valid (a partial unique index enforces
            // it), so a retake supersedes the previous proof.
            if ($reviewStatus === 'valid') {
                DeliveryProof::query()
                    ->where('shipment_id', $shipment->id)
                    ->where('review_status', 'valid')
                    ->update([
                        'review_status' => 'invalid',
                        'review_note' => 'Digantikan oleh percobaan POD yang lebih baru.',
                    ]);
            }

            $proof = DeliveryProof::create([
                'shipment_id' => $shipment->id,
                'courier_id' => $courier->id,
                'photo_path' => $path,
                'point' => DB::raw(Point::make($latitude, $longitude)),
                'distance_to_destination_m' => $distance,
                // Timestamps are persisted as UTC instants; the watermark
                // text renders the Jakarta wall clock from the same moment.
                'captured_at' => $capturedAtUtc,
                'device_captured_at' => $deviceCapturedAtUtc,
                'watermark_hash' => $this->watermark->hash(
                    $shipment->tracking_number,
                    $latitude,
                    $longitude,
                    $address,
                    $recipient,
                    $capturedAtUtc,
                ),
                'watermark_address' => $address,
                'recipient_name' => $recipient,
                'relation' => $relation,
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
                            'server' => $capturedAtUtc->toIso8601String(),
                            'device' => $deviceCapturedAtUtc?->toIso8601String(),
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
        });

        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return $proof;
    }
}
