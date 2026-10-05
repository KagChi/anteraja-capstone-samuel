<?php

namespace App\Services\Delivery;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\Geofence;
use App\Models\GeofencePolicy;
use App\Models\MeetingPoint;
use App\Models\Shipment;
use App\Support\Date;
use App\Support\Geo\Distance;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * FRD-04 location matchmaking: the courier proposes a handover point (with
 * the buyer's reported position), an admin approves it on the counterparty's
 * behalf or sets one unilaterally, and the approved point becomes the centre
 * of the completion geofence (FR-04-07).
 */
class MeetingPointService
{
    /** Destination -> buyer distance above which a meeting point is flagged (FR-04-03). */
    public const THRESHOLD_M = 50;

    /** A pending proposal expires after this window (FR-04-08). */
    public const EXPIRY_MINUTES = 30;

    /**
     * @param  array<string, mixed>  $data
     */
    public function propose(Shipment $shipment, Courier $courier, array $data): MeetingPoint
    {
        $this->expireStale($shipment);

        if ($shipment->meetingPoints()->where('status', 'proposed')->exists()) {
            abort(422, 'Masih ada usulan titik temu yang menunggu persetujuan.');
        }

        if ($shipment->meetingPoints()->whereIn('status', ['approved', 'admin_set'])->exists()) {
            abort(422, 'Titik temu final sudah ditetapkan untuk pengiriman ini.');
        }

        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];
        $buyer = isset($data['buyer_latitude'], $data['buyer_longitude'])
            ? [(float) $data['buyer_latitude'], (float) $data['buyer_longitude']]
            : null;

        $destination = $this->destinationPoint($shipment);
        $distanceToDestination = $destination !== null
            ? Distance::haversineMeters($destination[0], $destination[1], $latitude, $longitude)
            : 0;
        $distanceFromBuyer = $buyer !== null && $destination !== null
            ? Distance::haversineMeters($destination[0], $destination[1], $buyer[0], $buyer[1])
            : null;
        $expiresAt = Date::now()->addMinutes(self::EXPIRY_MINUTES)->utc();

        $meeting = DB::transaction(function () use ($shipment, $courier, $latitude, $longitude, $buyer, $distanceToDestination, $distanceFromBuyer, $expiresAt): MeetingPoint {
            $meeting = MeetingPoint::create([
                'shipment_id' => $shipment->id,
                'proposed_by_type' => 'courier',
                'proposed_by_id' => $courier->id,
                'proposed_point' => DB::raw(Point::make($latitude, $longitude)),
                'buyer_point' => $buyer !== null ? DB::raw(Point::make($buyer[0], $buyer[1])) : null,
                'distance_from_destination_m' => $distanceToDestination,
                'distance_from_buyer_m' => $distanceFromBuyer,
                'status' => 'proposed',
                'expires_at' => $expiresAt,
            ]);

            DeliveryEvent::create([
                'shipment_id' => $shipment->id,
                'courier_id' => $courier->id,
                'event_type' => 'meeting_point_proposed',
                'point' => DB::raw(Point::make($latitude, $longitude)),
                'distance_to_destination_m' => $distanceToDestination,
                'actor_type' => 'courier',
                'metadata' => array_filter([
                    'meeting_point' => $meeting->id,
                    'distance_from_buyer_m' => $distanceFromBuyer,
                    'buyer_point' => $buyer !== null ? ['latitude' => $buyer[0], 'longitude' => $buyer[1]] : null,
                    'expires_at' => $expiresAt->toIso8601String(),
                ], static fn ($value) => $value !== null),
            ]);

            return $meeting;
        });

        self::forgetCaches();

        return $meeting->refresh();
    }

    /**
     * FR-04-05/09: the admin approves the courier's proposal (acting for the
     * counterparty in this prototype), sets a point unilaterally, or rejects
     * the proposal. Every decision is recorded (FR-04-10).
     */
    public function decide(
        MeetingPoint $meeting,
        Admin $admin,
        string $decision,
        ?string $note = null,
        ?float $latitude = null,
        ?float $longitude = null,
    ): MeetingPoint {
        if ($meeting->status !== 'proposed') {
            abort(422, 'Usulan titik temu ini sudah diputuskan.');
        }

        $shipment = $meeting->shipment;

        if ($decision === 'approved') {
            $override = $latitude !== null && $longitude !== null;
            $proposed = Point::parse($meeting->proposed_point);
            $final = $override
                ? ['latitude' => $latitude, 'longitude' => $longitude]
                : ['latitude' => $proposed['latitude'] ?? 0.0, 'longitude' => $proposed['longitude'] ?? 0.0];

            $meeting->update([
                // An admin-set point replaces the suggestion; the original
                // courier proposal stays in the proposed event metadata.
                ...($override ? ['proposed_point' => DB::raw(Point::make($final['latitude'], $final['longitude']))] : []),
                'status' => $override ? 'admin_set' : 'approved',
                'approved_by_type' => 'admin',
                'approved_by_id' => $admin->id,
                'resolved_at' => Date::now()->utc(),
            ]);

            DeliveryEvent::create([
                'shipment_id' => $meeting->shipment_id,
                'courier_id' => $shipment?->courier_id,
                'event_type' => 'meeting_point_approved',
                'point' => DB::raw(Point::make($final['latitude'], $final['longitude'])),
                'actor_type' => 'admin',
                'metadata' => array_filter([
                    'meeting_point' => $meeting->id,
                    'note' => $note,
                    'admin_set' => $override ?: null,
                ], static fn ($value) => $value !== null),
            ]);

            if ($shipment !== null) {
                $this->activateGeofence($shipment, $final['latitude'], $final['longitude'], $admin);
            }

            AdminAction::create([
                'admin_id' => $admin->id,
                'action_type' => $override ? 'set_meeting_point' : 'approve_meeting_point',
                'target_type' => 'meeting_point',
                'target_id' => $meeting->id,
                'reason' => $note,
            ]);
        } else {
            $meeting->update([
                'status' => 'rejected',
                'approved_by_type' => 'admin',
                'approved_by_id' => $admin->id,
                'resolved_at' => Date::now()->utc(),
            ]);

            DeliveryEvent::create([
                'shipment_id' => $meeting->shipment_id,
                'courier_id' => $shipment?->courier_id,
                'event_type' => 'meeting_point_rejected',
                'actor_type' => 'admin',
                'metadata' => ['meeting_point' => $meeting->id, 'note' => $note],
            ]);

            AdminAction::create([
                'admin_id' => $admin->id,
                'action_type' => 'reject_meeting_point',
                'target_type' => 'meeting_point',
                'target_id' => $meeting->id,
                'reason' => $note,
            ]);
        }

        self::forgetCaches();

        return $meeting->refresh();
    }

    /**
     * FR-04-08: pending proposals past their window expire and can be
     * proposed again. Called before reads/writes so the state is never stale.
     */
    public function expireStale(?Shipment $shipment = null): int
    {
        $query = MeetingPoint::query()
            ->withPointProjections()
            ->where('status', 'proposed')
            ->where('expires_at', '<', Date::now()->utc());

        if ($shipment !== null) {
            $query->where('shipment_id', $shipment->id);
        }

        $stale = $query->get();

        foreach ($stale as $meeting) {
            $meeting->update(['status' => 'expired', 'resolved_at' => Date::now()->utc()]);

            DeliveryEvent::create([
                'shipment_id' => $meeting->shipment_id,
                'event_type' => 'meeting_point_expired',
                'point' => $meeting->point_lat !== null && $meeting->point_lng !== null
                    ? DB::raw(Point::make((float) $meeting->point_lat, (float) $meeting->point_lng))
                    : null,
                'actor_type' => 'system',
                'metadata' => ['meeting_point' => $meeting->id],
            ]);
        }

        if ($stale->isNotEmpty()) {
            self::forgetCaches();
        }

        return $stale->count();
    }

    /**
     * @return array{0: float, 1: float}|null
     */
    private function destinationPoint(Shipment $shipment): ?array
    {
        $row = DB::selectOne(
            'SELECT ST_Y(destination::geometry) AS lat, ST_X(destination::geometry) AS lng FROM shipments WHERE id = ?',
            [$shipment->id],
        );

        return $row !== null && $row->lat !== null
            ? [(float) $row->lat, (float) $row->lng]
            : null;
    }

    /**
     * FR-04-07: the active geofence follows the final meeting point.
     */
    private function activateGeofence(Shipment $shipment, float $latitude, float $longitude, Admin $admin): void
    {
        $geofence = $shipment->activeGeofence;

        if ($geofence !== null) {
            $geofence->update([
                'center' => DB::raw(Point::make($latitude, $longitude)),
                'source' => 'meeting_point',
            ]);

            return;
        }

        $radius = GeofencePolicy::query()
            ->where('service_type', $shipment->service_type)
            ->value('default_radius_m') ?? 100;

        Geofence::create([
            'shipment_id' => $shipment->id,
            'center' => DB::raw(Point::make($latitude, $longitude)),
            'radius_m' => (int) $radius,
            'source' => 'meeting_point',
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
    }

    private static function forgetCaches(): void
    {
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();
    }
}
