<?php

namespace App\Support\Presentation;

use App\Models\DeliveryException;
use App\Support\Date;
use App\Support\Geo\Point;
use App\Support\ProofMedia;

/**
 * Maps delivery exceptions onto `ExceptionRow` / `ExceptionDetail`.
 */
class ExceptionPresenter
{
    public static function row(DeliveryException $exception): array
    {
        $shipment = $exception->shipment;

        return [
            'id' => $shipment?->id ?? $exception->id,
            'courierName' => $exception->courier?->name ?? 'Belum ditugaskan',
            'courierCode' => $exception->courier?->code ?? '—',
            'tracking' => $shipment?->tracking_number,
            'service' => $shipment?->service_type === 'instant' ? 'instant' : ($shipment?->service_type === 'regular' ? 'regular' : 'sameday'),
            'deviation' => max(0, (int) $exception->distance_m - (int) $exception->radius_m),
            'maxTolerance' => (int) $exception->radius_m,
            'actualDistance' => (int) $exception->distance_m,
            'reason' => $exception->reason,
            'status' => $exception->status,
            'note' => $exception->review_note,
        ];
    }

    public static function detail(DeliveryException $exception): array
    {
        $shipment = $exception->shipment;
        $proof = $shipment?->deliveryProofs
            ?->sortByDesc(fn ($item) => $item->review_status === 'valid')
            ->first();
        $point = Point::parse($exception->requested_point);

        return [
            ...self::row($exception),
            'ticketAt' => Date::dateTimeLabel($exception->created_at),
            'ticketIso' => Date::iso($exception->created_at),
            'podPoint' => $point
                ? sprintf('%s, %s', number_format($point['latitude'], 4), number_format($point['longitude'], 4))
                : '—',
            'podCapturedAt' => Date::dateTimeLabel($proof?->captured_at),
            'podIso' => Date::iso($proof?->captured_at),
            'podPhotoUrl' => ProofMedia::signedUrl($proof),
        ];
    }
}
