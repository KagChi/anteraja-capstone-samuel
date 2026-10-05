<?php

namespace App\Support\Presentation;

use App\Models\DeliveryEvent;
use App\Models\MeetingPoint;
use App\Models\Shipment;
use App\Services\Delivery\MeetingPointService;
use App\Support\Date;
use App\Support\Geo\Point;

/**
 * Maps FRD-04 meeting points onto the courier task payload, the audit trail
 * section and the admin approval queue (`MeetingPointRow` /
 * `MeetingPointDetail` in resources/js/types.ts).
 */
class MeetingPointPresenter
{
    public const FINAL_STATUSES = ['approved', 'admin_set'];

    /**
     * The matchmaking state of one shipment for the courier/audit payload.
     *
     * @return array<string, mixed>|null
     */
    public static function task(Shipment $shipment): ?array
    {
        $points = $shipment->meetingPoints->sortByDesc('created_at');
        $final = $points->first(fn (MeetingPoint $point) => in_array($point->status, self::FINAL_STATUSES, true));
        $pending = $points->firstWhere('status', 'proposed');
        $current = $final ?? $pending ?? $points->first();

        if ($current === null) {
            return null;
        }

        $point = self::coordinates($current, 'proposed');
        $buyer = self::coordinates($current, 'buyer');
        $distanceFromBuyer = $current->distance_from_buyer_m !== null
            ? (int) $current->distance_from_buyer_m
            : null;

        return array_filter([
            'status' => $final !== null ? 'final' : $current->status,
            'final' => $final !== null,
            'adminSet' => $final !== null && $final->status === 'admin_set',
            'setBy' => $final !== null ? ($final->approved_by_type ?? 'admin') : $current->proposed_by_type,
            'latitude' => $point[0] ?? null,
            'longitude' => $point[1] ?? null,
            'distanceToDestinationM' => (int) $current->distance_from_destination_m,
            'buyerLatitude' => $buyer[0] ?? null,
            'buyerLongitude' => $buyer[1] ?? null,
            'distanceFromBuyerM' => $distanceFromBuyer,
            'needsMeetingPoint' => $final === null
                && $distanceFromBuyer !== null
                && $distanceFromBuyer > MeetingPointService::THRESHOLD_M,
            'thresholdM' => MeetingPointService::THRESHOLD_M,
            'expiryMinutes' => MeetingPointService::EXPIRY_MINUTES,
            'requestedTime' => Date::timeLabel($current->created_at),
            'resolvedTime' => $current->resolved_at !== null ? Date::timeLabel($current->resolved_at) : null,
            'expiresTime' => $current->status === 'proposed' ? Date::timeLabel($current->expires_at) : null,
            'expiresAtIso' => $current->status === 'proposed' ? Date::iso($current->expires_at) : null,
        ], static fn ($value) => $value !== null);
    }

    public static function row(MeetingPoint $meeting): array
    {
        $shipment = $meeting->shipment;
        $point = self::coordinates($meeting, 'proposed');

        return [
            'id' => $meeting->id,
            'tracking' => $shipment?->tracking_number,
            'courierName' => $shipment?->courier?->name ?? 'Belum ditugaskan',
            'courierCode' => '#'.($shipment?->courier?->code ?? '—'),
            'service' => $shipment?->service_type === 'instant'
                ? 'instant'
                : ($shipment?->service_type === 'regular' ? 'regular' : 'sameday'),
            'status' => $meeting->status,
            'proposedBy' => $meeting->proposed_by_type,
            'latitude' => $point[0] ?? null,
            'longitude' => $point[1] ?? null,
            'distanceToDestinationM' => (int) $meeting->distance_from_destination_m,
            'distanceFromBuyerM' => $meeting->distance_from_buyer_m !== null
                ? (int) $meeting->distance_from_buyer_m
                : null,
            'requestedAt' => Date::dateTimeLabel($meeting->created_at),
            'requestedTime' => Date::timeLabel($meeting->created_at),
            'resolvedAt' => $meeting->resolved_at !== null ? Date::dateTimeLabel($meeting->resolved_at) : '—',
            'expiresAt' => $meeting->expires_at !== null ? Date::dateTimeLabel($meeting->expires_at) : '—',
        ];
    }

    public static function adminDetail(MeetingPoint $meeting): array
    {
        $shipment = $meeting->shipment;
        $target = ($shipment?->destination_lat !== null && $shipment?->destination_lng !== null)
            ? [(float) $shipment->destination_lat, (float) $shipment->destination_lng]
            : null;
        $courierEvent = $shipment?->deliveryEvents
            ?->filter(fn (DeliveryEvent $event) => $event->point_lat !== null)
            ->sortByDesc('created_at')
            ->first();
        $courierPoint = $courierEvent !== null
            ? [(float) $courierEvent->point_lat, (float) $courierEvent->point_lng]
            : null;

        $events = $shipment?->deliveryEvents
            ?->filter(fn (DeliveryEvent $event) => str_starts_with($event->event_type, 'meeting_point_'))
            ->sortByDesc('created_at')
            ->take(5)
            ->map(fn (DeliveryEvent $event) => [
                'type' => $event->event_type,
                'actor' => $event->actor_type,
                'note' => $event->metadata['note'] ?? null,
                'at' => Date::dateTimeLabel($event->created_at),
            ])
            ->values()
            ->all() ?? [];

        return [
            ...self::row($meeting),
            'target' => $target,
            'courierPoint' => $courierPoint,
            'buyerPoint' => self::coordinates($meeting, 'buyer'),
            'point' => self::coordinates($meeting, 'proposed'),
            'radiusMeters' => (int) ($shipment?->activeGeofence?->radius_m ?? 0),
            'geofenceSource' => $shipment?->activeGeofence?->source,
            'events' => $events,
        ];
    }

    /**
     * @return array{0: float, 1: float}|null
     */
    private static function coordinates(MeetingPoint $meeting, string $kind): ?array
    {
        $lat = $kind === 'buyer' ? $meeting->buyer_lat : $meeting->point_lat;
        $lng = $kind === 'buyer' ? $meeting->buyer_lng : $meeting->point_lng;

        if ($lat !== null && $lng !== null) {
            return [(float) $lat, (float) $lng];
        }

        $raw = $kind === 'buyer' ? $meeting->buyer_point : $meeting->proposed_point;
        $parsed = is_string($raw) ? Point::parse($raw) : null;

        return $parsed !== null ? [$parsed['latitude'], $parsed['longitude']] : null;
    }
}
