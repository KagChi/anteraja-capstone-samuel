<?php

namespace App\Support\Presentation;

use App\Models\DeliveryProof;
use App\Models\Shipment;
use App\Services\Verification\PinService;
use App\Support\Date;
use App\Support\Geo\Distance;
use App\Support\Geo\ServiceAreas;

/**
 * Maps Eloquent shipments onto the shapes consumed by the React UI
 * (`DeliveryRow`, `DeliveryTask`, `ShipmentDetail` in resources/js/types.ts).
 */
class DeliveryPresenter
{
    public static function row(Shipment $shipment): array
    {
        $area = self::area($shipment);
        $flag = self::flag($shipment);
        $deviation = self::deviation($shipment);

        return [
            'id' => $shipment->id,
            'courierName' => $shipment->courier?->name ?? 'Belum ditugaskan',
            'courierCode' => '#'.($shipment->courier?->code ?? '—'),
            'tracking' => $shipment->tracking_number,
            'service' => self::serviceSegment($shipment->service_type),
            'flag' => $flag,
            'statusLabel' => self::statusLabel($shipment, $flag, $deviation),
            'statusTone' => self::tone($flag),
            'region' => $area['region'],
            'regionLabel' => $area['label'],
            'regencyId' => $area['regencyId'],
            'recipient' => $shipment->recipient?->name,
            'address' => $shipment->destination_address,
            'href' => self::href($shipment->id, $flag),
            'highlight' => $flag !== 'delivered' && self::needsReview($shipment),
        ];
    }

    /**
     * Builds a list row from the flat projection produced by
     * `Shipment::scopeForListPresentation()` — one query, no eager loads.
     */
    public static function rowFromList(object $row): array
    {
        $needsReview = (float) $row->anomaly_weight >= 2.0
            || self::truthy($row->proof_needs_review);

        $flag = self::truthy($row->pending_exception)
            ? 'exception'
            : (($row->status === 'delivered' && ! $needsReview) ? 'delivered' : 'review');

        $deviation = $row->proof_distance !== null
            ? (int) $row->proof_distance
            : (int) ($row->latest_distance ?? 0);

        $area = self::areaFromCode($row->area_code);

        return [
            'id' => $row->id,
            'courierName' => $row->courier_name ?? 'Belum ditugaskan',
            'courierCode' => '#'.($row->courier_code ?? '—'),
            'tracking' => $row->tracking_number,
            'service' => self::serviceSegment($row->service_type),
            'flag' => $flag,
            'statusLabel' => self::statusLabelFrom($row->status, $flag, $deviation, $row->pin_status),
            'statusTone' => self::tone($flag),
            'region' => $area['region'],
            'regionLabel' => $area['label'],
            'regencyId' => $area['regencyId'],
            'recipient' => $row->recipient_name,
            'address' => $row->destination_address,
            'href' => self::href($row->id, $flag),
            'highlight' => $flag !== 'delivered' && $needsReview,
        ];
    }

    public static function task(Shipment $shipment): array
    {
        $distance = self::latestDistance($shipment);
        $deviation = self::deviation($shipment);
        $radius = $shipment->activeGeofence?->radius_m;
        $exception = $shipment->deliveryExceptions
            ->sortByDesc('created_at')
            ->first();
        $gpsLock = $shipment->gpsLockRequests
            ->sortByDesc('created_at')
            ->first();
        $pin = $shipment->pinChallenge;
        $geofenceCenter = [
            (float) ($shipment->destination_lat ?? 0.0),
            (float) ($shipment->destination_lng ?? 0.0),
        ];

        $category = $shipment->service_type === 'instant' ? 'instant' : 'sameday';

        $badges = [[
            'label' => $shipment->service_type === 'instant' ? 'Instant' : 'Same-Day',
            'tone' => $shipment->service_type === 'instant' ? 'service-instant' : 'service-sameday',
        ]];

        if ($shipment->pin_required) {
            $badges[] = ['label' => 'Perlu PIN', 'tone' => 'pin'];
        }

        if ($shipment->cod_amount > 0) {
            $badges[] = ['label' => 'COD '.self::rupiah($shipment->cod_amount), 'tone' => 'pill'];
        }

        return array_filter([
            'tracking' => $shipment->tracking_number,
            'category' => $category,
            'recipient' => $shipment->recipient?->name ?? 'Penerima',
            'address' => $shipment->destination_address,
            'distance' => $distance !== null ? Distance::label($distance) : '—',
            'eta' => self::etaLabel($shipment),
            'badges' => $badges,
            'footerNote' => $shipment->cod_amount > 0 ? 'COD '.self::rupiah($shipment->cod_amount) : null,
            'cta' => 'Mulai Antar',
            'destination' => [
                'latitude' => (float) ($shipment->destination_lat ?? 0.0),
                'longitude' => (float) ($shipment->destination_lng ?? 0.0),
                'label' => $shipment->destination_address,
            ],
            'geofence' => $radius !== null ? [
                'distanceMeters' => $distance ?? 0,
                'deviationMeters' => $deviation,
                'radiusMeters' => $radius,
                'point' => $shipment->destination_address,
                'center' => $geofenceCenter,
            ] : null,
            'exception' => $exception ? [
                'status' => $exception->status,
                'reason' => $exception->reason,
                'submittedTime' => Date::timeLabel($exception->created_at),
            ] : null,
            'gpsLock' => $gpsLock ? [
                'status' => $gpsLock->status,
                'reason' => $gpsLock->reason,
                'requestedTime' => Date::timeLabel($gpsLock->created_at),
                'decidedTime' => $gpsLock->reviewed_at ? Date::timeLabel($gpsLock->reviewed_at) : null,
                'note' => $gpsLock->review_note,
            ] : null,
            'pin' => $pin ? [
                'status' => $pin->status,
                'attempts' => (int) $pin->attempts,
                'maxAttempts' => (int) $pin->max_attempts,
                'locked' => $pin->status === 'locked',
                'verified' => in_array($pin->status, ['verified', 'override'], true),
                'override' => $pin->status === 'override',
                'overrideReason' => $pin->override_reason,
                'lockedAt' => $pin->locked_at ? Date::timeLabel($pin->locked_at) : null,
                'resendCount' => (int) $pin->resend_count,
                'resendLimit' => PinService::resendLimit($shipment),
            ] : null,
        ], static fn ($value) => $value !== null);
    }

    public static function detail(Shipment $shipment): array
    {
        $events = $shipment->deliveryEvents;
        $deviation = self::deviation($shipment);
        $radius = $shipment->activeGeofence?->radius_m ?? 0;
        $proof = self::proof($shipment);
        $pin = $shipment->pinChallenge;
        $case = $shipment->claimCases
            ->sortByDesc('created_at')
            ->first();

        $timeline = $events->map(fn ($event) => [
            'label' => self::eventLabel($event->event_type, $event->metadata ?? []),
            'time' => Date::timeLabel($event->created_at),
        ])->values()->all();

        $milestones = $events->map(fn ($event) => [
            'time' => Date::timeLabel($event->created_at),
            'datetime' => Date::jakarta($event->created_at)?->format('H:i') ?? '',
            'text' => self::eventLabel($event->event_type, $event->metadata ?? []),
            'accent' => self::eventAccent($event->event_type),
        ])->values()->all();

        $destination = self::pointFromSelect($shipment);
        $courierPoint = self::courierPoint($shipment);

        return [
            'timeline' => $timeline,
            'milestones' => $milestones,
            'geofence' => [
                'target' => $destination,
                'courier' => $courierPoint,
                'radiusMeters' => $radius,
                'deviationMeters' => $deviation,
                'pointLabel' => $shipment->destination_address,
                'analysis' => self::geofenceAnalysis($shipment, $courierPoint, $deviation, $radius),
            ],
            'pod' => [
                'id' => $proof?->id,
                // Attached per request by ShipmentReadService (short-lived,
                // admin-only signed URL); never cached here.
                'photoUrl' => null,
                'capturedTime' => $proof ? Date::timeLabel($proof->captured_at) : '—',
                'capturedAtIso' => $proof ? Date::iso($proof->captured_at) : null,
                'watermark' => $proof
                    ? trim(implode(' • ', array_filter([
                        self::proofCoordinates($proof),
                        $proof->watermark_address,
                        Date::dateTimeLabel($proof->captured_at),
                    ])), ' •')
                    : '—',
                'recipientName' => $proof?->recipient_name ?? $shipment->recipient?->name ?? 'Penerima',
                'relation' => self::relationLabel($proof?->relation),
                'pin' => $pin && $pin->status === 'verified' ? '••••' : '—',
                'pinStatus' => $pin?->status,
                'pinVerifiedAt' => Date::timeLabel($pin?->verified_at),
                'distanceMeters' => $proof?->distance_to_destination_m,
                'reviewStatus' => $proof?->review_status,
                'reviewNote' => $proof?->review_note,
                'watermarkHash' => $proof?->watermark_hash,
            ],
            'case' => $case ? [
                'number' => $case->case_number,
                'status' => $case->status,
                'closed' => $case->status === 'closed',
                'investigating' => $case->status === 'investigating',
                'resolution' => $case->resolution
                    ?? $case->findings->sortByDesc('created_at')->first()?->finding,
                'closedAt' => Date::dateTimeLabel($case->closed_at),
            ] : null,
            'deviationMeters' => $deviation,
            'maxToleranceMeters' => $radius,
            'gps' => self::gps($shipment),
            'reason' => $shipment->deliveryExceptions
                ->firstWhere('status', 'approved')?->reason
                ?? 'Tidak ada pengecualian radius yang disetujui.',
            'completedLabel' => $shipment->delivered_at
                ? 'Selesai '.Date::timeLabel($shipment->delivered_at)
                : 'Belum selesai',
        ];
    }

    public static function flag(Shipment $shipment): string
    {
        $pendingException = $shipment->deliveryExceptions
            ->contains(fn ($exception) => $exception->status === 'pending');

        if ($pendingException) {
            return 'exception';
        }

        if ($shipment->status === 'delivered' && ! self::needsReview($shipment)) {
            return 'delivered';
        }

        return 'review';
    }

    /**
     * Courier history row: the completed stop as the courier sees it after the
     * handover (status, review outcome and handover distance).
     */
    public static function historyRow(Shipment $shipment): array
    {
        $proof = $shipment->deliveryProofs
            ->sortByDesc('captured_at')
            ->first();
        $flagged = self::needsReview($shipment);

        return [
            'id' => $shipment->id,
            'tracking' => $shipment->tracking_number,
            'service' => self::serviceSegment($shipment->service_type),
            'recipient' => $shipment->recipient?->name ?? 'Penerima',
            'address' => $shipment->destination_address,
            'status' => $shipment->status,
            'statusLabel' => match (true) {
                $shipment->status === 'failed' => 'Gagal',
                $flagged => 'Perlu Tinjauan',
                default => 'Terverifikasi',
            },
            'dateLabel' => Date::dateTimeLabel($shipment->delivered_at ?? $shipment->created_at),
            'distanceMeters' => $proof?->distance_to_destination_m,
            'reviewStatus' => $proof?->review_status,
        ];
    }

    public static function needsReview(Shipment $shipment): bool
    {
        $score = $shipment->anomalyFlags
            ->where('is_resolved', false)
            ->sum(fn ($flag) => (float) $flag->weight);

        if ($score >= 2.0) {
            return true;
        }

        return $shipment->deliveryProofs
            ->contains(fn ($proof) => $proof->review_status === 'needs_review');
    }

    /**
     * GPS integrity summary for the audit trail: the detector evidence stored
     * on the latest POD, the anomaly flag and the review decision (FRD-06).
     *
     * @return array<string, mixed>
     */
    private static function gps(Shipment $shipment): array
    {
        $proof = $shipment->deliveryProofs
            ->filter(fn ($item) => $item->gps_evidence !== null)
            ->sortByDesc('captured_at')
            ->first();
        $evidence = is_array($proof?->gps_evidence) ? $proof->gps_evidence : [];
        $flag = $shipment->anomalyFlags->firstWhere('flag_type', 'mock_gps_suspected');
        $flagDetails = is_array($flag?->details) ? $flag->details : [];
        $lock = $shipment->gpsLockRequests->sortByDesc('created_at')->first();

        $level = $evidence['level'] ?? $flagDetails['level'] ?? null;
        $overrideId = $evidence['override_id'] ?? null;
        $reasons = $evidence['reasons'] ?? ($flagDetails['reasons'] ?? []);

        return [
            'status' => match (true) {
                $overrideId !== null => 'overridden',
                $level === 'blocked' => 'blocked',
                $level === 'suspected' => 'suspected',
                $flag !== null => 'suspected',
                default => 'clean',
            },
            'level' => $level,
            'accuracyM' => $proof?->gps_accuracy_m ?? ($flagDetails['accuracy_m'] ?? null),
            'reasons' => GpsEvidence::reasons($reasons),
            'impliedSpeedKmh' => $evidence['implied_speed_kmh'] ?? ($flagDetails['implied_speed_kmh'] ?? null),
            'fixWindow' => GpsEvidence::fixWindow($evidence['fix_window'] ?? ($flagDetails['fix_window'] ?? null)),
            'clockSkewSeconds' => $evidence['clock_skew_seconds'] ?? ($flagDetails['clock_skew_seconds'] ?? null),
            'overrideUsed' => $overrideId !== null,
            'lock' => $lock ? [
                'status' => $lock->status,
                'reason' => $lock->reason,
                'requestedTime' => Date::timeLabel($lock->created_at),
                'decidedTime' => $lock->reviewed_at ? Date::timeLabel($lock->reviewed_at) : null,
                'note' => $lock->review_note,
            ] : null,
        ];
    }

    public static function deviation(Shipment $shipment): int
    {
        $proof = self::proof($shipment);

        if ($proof) {
            return (int) $proof->distance_to_destination_m;
        }

        return self::latestDistance($shipment) ?? 0;
    }

    public static function latestDistance(Shipment $shipment): ?int
    {
        $event = $shipment->deliveryEvents
            ->filter(fn ($event) => $event->distance_to_destination_m !== null)
            ->sortByDesc('created_at')
            ->first();

        return $event?->distance_to_destination_m !== null
            ? (int) $event->distance_to_destination_m
            : null;
    }

    private static function proof(Shipment $shipment): ?DeliveryProof
    {
        return $shipment->deliveryProofs
            ->sortByDesc(fn ($proof) => $proof->review_status === 'valid')
            ->first();
    }

    private static function proofCoordinates(DeliveryProof $proof): ?string
    {
        $latitude = $proof->point_lat ?? null;
        $longitude = $proof->point_lng ?? null;

        if ($latitude === null || $longitude === null) {
            return null;
        }

        return sprintf('%.6f, %.6f', (float) $latitude, (float) $longitude);
    }

    private static function relationLabel(?string $relation): ?string
    {
        return match ($relation) {
            'langsung' => 'Penerima Langsung',
            'keluarga' => 'Keluarga Penerima',
            'satpam' => 'Satpam / Keamanan',
            default => $relation,
        };
    }

    /**
     * The handover position: the POD capture point of the chosen proof. Null
     * while the shipment has no proof, so the map never implies the courier
     * is on site when they are not.
     *
     * @return array{0: float, 1: float}|null
     */
    private static function courierPoint(Shipment $shipment): ?array
    {
        $proof = $shipment->deliveryProofs->first(
            fn ($proof) => $proof->point_lat !== null && $proof->point_lng !== null,
        );

        return $proof !== null
            ? [(float) $proof->point_lat, (float) $proof->point_lng]
            : null;
    }

    /**
     * @param  array{0: float, 1: float}|null  $courierPoint
     */
    private static function geofenceAnalysis(Shipment $shipment, ?array $courierPoint, int $deviation, int $radius): string
    {
        if ($courierPoint === null) {
            return 'Belum ada bukti titik serah terima (POD) untuk pengiriman ini.';
        }

        return $deviation <= $radius
            ? 'Titik serah terima POD berada di dalam radius geofence.'
            : 'Titik serah terima POD berada di luar radius geofence.';
    }

    private static function statusLabel(Shipment $shipment, string $flag, int $deviation): string
    {
        return self::statusLabelFrom(
            $shipment->status,
            $flag,
            $deviation,
            $shipment->pinChallenge?->status,
        );
    }

    private static function statusLabelFrom(string $status, string $flag, int $deviation, ?string $pinStatus): string
    {
        if ($flag === 'exception') {
            return 'Pengecualian Menunggu';
        }

        if ($status === 'delivered') {
            $prefix = $flag === 'review' ? 'Perlu Tinjauan' : 'Terverifikasi';

            return $deviation > 0 ? sprintf('%s (+%d m)', $prefix, $deviation) : $prefix;
        }

        if ($status === 'failed') {
            return $pinStatus === 'locked'
                ? 'Perlu Tinjauan (PIN gagal)'
                : 'Pengiriman Gagal';
        }

        return match ($status) {
            'in_transit' => 'Dalam Perjalanan',
            'picked_up' => 'Dalam Penjemputan',
            default => 'Menunggu Penjemputan',
        };
    }

    private static function tone(string $flag): string
    {
        return match ($flag) {
            'exception' => 'orange',
            'delivered' => 'emerald',
            default => 'amber',
        };
    }

    private static function href(string $id, string $flag): string
    {
        return $flag === 'exception'
            ? '/admin/antrian-pengecualian?open='.$id
            : '/admin/audit-trail/'.$id;
    }

    private static function truthy(mixed $value): bool
    {
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }

    private static function etaLabel(Shipment $shipment): string
    {
        $sla = $shipment->service_type === 'instant' ? 120 : 240;
        $elapsed = (int) $shipment->created_at?->diffInMinutes(Date::now()) ?? 0;
        $remaining = max(1, $sla - $elapsed);

        if ($shipment->status === 'delivered') {
            return 'Selesai';
        }

        return $remaining.' mnt';
    }

    /**
     * @return array{region: string, label: string, regencyId: string}
     */
    private static function area(Shipment $shipment): array
    {
        return self::areaFromCode($shipment->serviceArea?->code);
    }

    /**
     * @return array{region: string, label: string, regencyId: string}
     */
    private static function areaFromCode(?string $code): array
    {
        return ServiceAreas::fromCode($code);
    }

    private static function serviceSegment(string $serviceType): string
    {
        return $serviceType === 'instant' ? 'instant' : ($serviceType === 'regular' ? 'regular' : 'sameday');
    }

    /**
     * @return array{0: float, 1: float}
     */
    private static function pointFromSelect(Shipment $shipment): array
    {
        return [
            (float) ($shipment->destination_lat ?? 0.0),
            (float) ($shipment->destination_lng ?? 0.0),
        ];
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function eventLabel(string $type, array $metadata): string
    {
        return match ($type) {
            'pickup' => 'Paket dijemput dari hub',
            'arrived' => 'Kurir tiba di sekitar alamat tujuan',
            'geofence_check' => ($metadata['inside'] ?? false)
                ? 'Geofence lolos verifikasi server'
                : 'Geofence di luar radius — perlu pengecualian',
            'pin_verification' => match ($metadata['result'] ?? '') {
                'verified' => 'PIN terverifikasi oleh penerima',
                'failed' => 'PIN salah (percobaan '.($metadata['attempt'] ?? 1).')',
                'expired' => 'PIN kedaluwarsa',
                'unlocked' => 'Blokir PIN dibuka Admin',
                'override' => 'PIN dilewati atas persetujuan Admin',
                default => 'Verifikasi PIN diproses',
            },
            'pod_captured' => 'Bukti foto (POD) diambil',
            'gps_blocked' => 'Lokasi tidak wajar - POD diblokir sistem',
            'gps_lock_requested' => 'Kurir meminta peninjauan blokir GPS',
            'gps_lock_decided' => 'Blokir GPS diputuskan Admin',
            'delivery_attempt' => 'Upaya serah terima dicatat',
            'exception_requested' => 'Pengecualian radius diajukan kurir',
            'exception_decided' => 'Pengecualian diputuskan admin',
            'delivered' => 'Pengiriman dituntaskan',
            'failed' => 'Pengiriman gagal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }

    private static function eventAccent(string $type): ?string
    {
        return match ($type) {
            'pin_verification' => 'tertiary',
            'delivered', 'exception_decided',
            'gps_blocked', 'gps_lock_decided' => 'magenta',
            default => null,
        };
    }

    private static function rupiah(int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }
}
