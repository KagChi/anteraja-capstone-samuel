<?php

namespace App\Support\Presentation;

use App\Models\DeliveryProof;
use App\Models\Shipment;
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

        return [
            'timeline' => $timeline,
            'milestones' => $milestones,
            'geofence' => [
                'target' => $destination,
                'courier' => $destination,
                'radiusMeters' => $radius,
                'deviationMeters' => $deviation,
                'pointLabel' => $shipment->destination_address,
                'analysis' => $shipment->activeGeofence?->source === 'meeting_point'
                    ? 'Titik pusat geofence mengikuti titik temu final.'
                    : 'Analisis radius dihitung dari titik serah terima terakhir.',
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
                'reviewStatus' => $proof?->review_status,
                'reviewNote' => $proof?->review_note,
                'watermarkHash' => $proof?->watermark_hash,
            ],
            'deviationMeters' => $deviation,
            'maxToleranceMeters' => $radius,
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
                default => 'Verifikasi PIN diproses',
            },
            'pod_captured' => 'Bukti foto (POD) diambil',
            'delivery_attempt' => 'Upaya serah terima dicatat',
            'exception_requested' => 'Pengecualian radius diajukan kurir',
            'exception_decided' => 'Pengecualian diputuskan admin',
            'meeting_point_proposed' => 'Titik temu diusulkan',
            'meeting_point_approved' => 'Titik temu disetujui',
            'delivered' => 'Pengiriman dituntaskan',
            'failed' => 'Pengiriman gagal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }

    private static function eventAccent(string $type): ?string
    {
        return match ($type) {
            'pin_verification' => 'tertiary',
            'delivered', 'exception_decided', 'meeting_point_approved' => 'magenta',
            default => null,
        };
    }

    private static function rupiah(int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }
}
