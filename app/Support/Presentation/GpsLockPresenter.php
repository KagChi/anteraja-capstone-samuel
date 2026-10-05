<?php

namespace App\Support\Presentation;

use App\Models\GpsLockRequest;
use App\Support\Date;
use App\Support\Geo\Point;

/**
 * Maps GPS lock review requests onto the shapes consumed by the admin
 * approval queue (`GpsLockRow` / `GpsLockDetail` in resources/js/types.ts).
 */
class GpsLockPresenter
{
    public static function row(GpsLockRequest $lock): array
    {
        $shipment = $lock->shipment;
        $evidence = is_array($lock->evidence) ? $lock->evidence : [];
        $reasons = is_array($evidence['reasons'] ?? null) ? $evidence['reasons'] : [];

        return [
            'id' => $lock->id,
            'courierName' => $lock->courier?->name ?? 'Belum ditugaskan',
            'courierCode' => '#'.($lock->courier?->code ?? '—'),
            'tracking' => $shipment?->tracking_number,
            'service' => $shipment?->service_type === 'instant'
                ? 'instant'
                : ($shipment?->service_type === 'regular' ? 'regular' : 'sameday'),
            'reason' => $lock->reason,
            'reasonLabels' => array_values(array_filter(array_map(
                static fn ($reason) => is_array($reason) ? ($reason['label'] ?? null) : null,
                $reasons,
            ))),
            'level' => $evidence['level'] ?? 'blocked',
            'accuracyM' => $lock->accuracy_m,
            'status' => $lock->status,
            'requestedAt' => Date::dateTimeLabel($lock->created_at),
            'requestedTime' => Date::timeLabel($lock->created_at),
            'note' => $lock->review_note,
        ];
    }

    public static function detail(GpsLockRequest $lock): array
    {
        $evidence = is_array($lock->evidence) ? $lock->evidence : [];
        $point = Point::parse($lock->point);
        $shipment = $lock->shipment;
        $target = ($shipment?->destination_lat !== null && $shipment?->destination_lng !== null)
            ? [(float) $shipment->destination_lat, (float) $shipment->destination_lng]
            : null;

        return [
            ...self::row($lock),
            'reasons' => GpsEvidence::reasons($evidence['reasons'] ?? []),
            'impliedSpeedKmh' => $evidence['implied_speed_kmh'] ?? null,
            'fixWindow' => GpsEvidence::fixWindow($evidence['fix_window'] ?? null),
            'clockSkewSeconds' => $evidence['clock_skew_seconds'] ?? null,
            'point' => $point ? [$point['latitude'], $point['longitude']] : null,
            'pointLabel' => $point
                ? sprintf('%.6f, %.6f', $point['latitude'], $point['longitude'])
                : '—',
            'target' => $target,
            'decidedAt' => Date::dateTimeLabel($lock->reviewed_at),
        ];
    }
}
