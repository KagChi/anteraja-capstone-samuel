<?php

namespace App\Services\Delivery;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\DeliveryException;
use App\Models\Shipment;
use App\Services\Geofence\GeofenceService;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\DB;

/**
 * Geofence exception workflow (FRD-01-06/07).
 */
class ExceptionService
{
    public function __construct(private readonly GeofenceService $geofence) {}

    public function request(Shipment $shipment, Courier $courier, float $latitude, float $longitude, string $reason): DeliveryException
    {
        $evaluation = $this->geofence->evaluate($shipment, $latitude, $longitude);

        $exception = DeliveryException::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'requested_point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_m' => $evaluation['distance_m'],
            'radius_m' => $evaluation['radius_m'] ?? max(1, $evaluation['distance_m']),
            'reason' => $reason,
            'status' => 'pending',
        ]);

        $event = DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'event_type' => 'exception_requested',
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'distance_to_destination_m' => $evaluation['distance_m'],
            'actor_type' => 'courier',
        ]);

        $exception->update(['event_id' => $event->id]);

        return $exception->refresh();
    }

    public function decide(DeliveryException $exception, Admin $admin, string $decision, ?string $note = null): DeliveryException
    {
        $exception->update([
            'status' => $decision,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Date::now(),
            'review_note' => $note,
        ]);

        DeliveryEvent::create([
            'shipment_id' => $exception->shipment_id,
            'courier_id' => $exception->courier_id,
            'event_type' => 'exception_decided',
            'actor_type' => 'admin',
            'metadata' => ['decision' => $decision, 'note' => $note],
        ]);

        AdminAction::create([
            'admin_id' => $admin->id,
            'action_type' => $decision === 'approved' ? 'approve_exception' : 'reject_exception',
            'target_type' => 'delivery_exception',
            'target_id' => $exception->id,
            'reason' => $note,
        ]);

        return $exception;
    }
}
