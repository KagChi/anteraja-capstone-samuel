<?php

namespace App\Support\Presentation;

use App\Models\DeliveryEvent;
use App\Models\PinChallenge;
use App\Support\Date;

/**
 * Maps PIN challenges awaiting an admin decision onto the shapes consumed by
 * the PIN lock dashboard (`PinLockRow` / `PinLockDetail` in types.ts).
 */
class PinLockPresenter
{
    public static function row(PinChallenge $challenge): array
    {
        $shipment = $challenge->shipment;

        return [
            'id' => $challenge->id,
            'tracking' => $shipment?->tracking_number,
            'courierName' => $shipment?->courier?->name ?? 'Belum ditugaskan',
            'courierCode' => '#'.($shipment?->courier?->code ?? '—'),
            'service' => $shipment?->service_type === 'instant'
                ? 'instant'
                : ($shipment?->service_type === 'regular' ? 'regular' : 'sameday'),
            'recipientName' => $shipment?->recipient?->name ?? 'Penerima',
            'status' => $challenge->status,
            'attempts' => (int) $challenge->attempts,
            'maxAttempts' => (int) $challenge->max_attempts,
            'lockedAt' => Date::dateTimeLabel($challenge->locked_at),
            'lockedTime' => Date::timeLabel($challenge->locked_at),
            'expiresAt' => Date::dateTimeLabel($challenge->expires_at),
            'overrideReason' => $challenge->override_reason,
        ];
    }

    public static function detail(PinChallenge $challenge): array
    {
        $events = DeliveryEvent::query()
            ->where('shipment_id', $challenge->shipment_id)
            ->where('event_type', 'pin_verification')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn (DeliveryEvent $event) => [
                'result' => $event->metadata['result'] ?? 'attempt',
                'attempt' => $event->metadata['attempt'] ?? null,
                'reason' => $event->metadata['reason'] ?? null,
                'actor' => $event->actor_type,
                'at' => Date::dateTimeLabel($event->created_at),
            ])
            ->values()
            ->all();

        return [
            ...self::row($challenge),
            'events' => $events,
        ];
    }
}
