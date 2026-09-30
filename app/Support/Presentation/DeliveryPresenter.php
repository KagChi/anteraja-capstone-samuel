<?php

namespace App\Support\Presentation;

use App\Models\DeliveryProof;
use App\Models\Shipment;
use App\Support\Date;
use App\Support\Geo\Distance;

/**
 * Maps Eloquent shipments onto the shapes consumed by the React UI
 * (`DeliveryRow`, `DeliveryTask`, `ShipmentDetail` in resources/js/types.ts).
 */
class DeliveryPresenter
{
    /**
     * @var array<string, array{region: string, label: string, regencyId: string}>
     */
    private const AREAS = [
        'JKS' => ['region' => 'jaksel', 'label' => 'Jak-Sel', 'regencyId' => '3171'],
        'JKT' => ['region' => 'jaktim', 'label' => 'Jak-Tim', 'regencyId' => '3172'],
        'JKP' => ['region' => 'jakpus', 'label' => 'Jak-Pus', 'regencyId' => '3173'],
        'JKB' => ['region' => 'jakbar', 'label' => 'Jak-Bar', 'regencyId' => '3174'],
    ];

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
            'statusTone' => match ($flag) {
                'exception' => 'orange',
                'delivered' => 'emerald',
                default => 'amber',
            },
            'region' => $area['region'],
            'regionLabel' => $area['label'],
            'regencyId' => $area['regencyId'],
            'recipient' => $shipment->recipient?->name,
            'address' => $shipment->destination_address,
            'href' => $flag === 'exception'
                ? '/admin/pengecualian-detail/'.$shipment->id
                : '/admin/audit-trail/'.$shipment->id,
            'highlight' => $flag !== 'delivered' && self::needsReview($shipment),
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
                    : 'Deviasi dinilai wajar untuk area drop-off / parkir lobi.',
            ],
            'pod' => [
                'photoSeed' => $proof?->photo_path ?? $shipment->tracking_number,
                'capturedTime' => $proof ? Date::timeLabel($proof->captured_at) : '—',
                'watermark' => $proof
                    ? trim(($proof->watermark_address ?? '').' • '.Date::dateTimeLabel($proof->captured_at), ' •')
                    : '—',
                'recipientName' => $proof?->recipient_name ?? $shipment->recipient?->name ?? 'Penerima',
                'relation' => 'Penerima Langsung',
                'pin' => $pin && $pin->status === 'verified' ? '••••' : '—',
            ],
            'deviationMeters' => $deviation,
            'maxToleranceMeters' => $radius,
            'reason' => $shipment->deliveryExceptions
                ->firstWhere('status', 'approved')?->reason
                ?? 'Deviasi dinilai wajar untuk area drop-off / parkir lobi.',
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

    private static function statusLabel(Shipment $shipment, string $flag, int $deviation): string
    {
        if ($flag === 'exception') {
            return 'Pengecualian Menunggu';
        }

        if ($shipment->status === 'delivered') {
            $prefix = $flag === 'review' ? 'Perlu Tinjauan' : 'Terverifikasi';

            return $deviation > 0 ? sprintf('%s (+%d m)', $prefix, $deviation) : $prefix;
        }

        if ($shipment->status === 'failed') {
            $pin = $shipment->pinChallenge;

            return $pin && $pin->status === 'locked'
                ? 'Perlu Tinjauan (PIN gagal)'
                : 'Pengiriman Gagal';
        }

        return match ($shipment->status) {
            'in_transit' => 'Dalam Perjalanan',
            'picked_up' => 'Dalam Penjemputan',
            default => 'Menunggu Penjemputan',
        };
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
        $code = $shipment->serviceArea?->code;

        return self::AREAS[$code] ?? ['region' => 'jaksel', 'label' => 'Jak-Sel', 'regencyId' => '3171'];
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
