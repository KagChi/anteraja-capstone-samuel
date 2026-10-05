<?php

namespace App\Services\Verification;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\GpsLockRequest;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use App\Support\Geo\Point;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * FRD-06 review workflow: a courier blocked by the fake-GPS gate asks for an
 * admin review, and the admin's approval unlocks the POD/completion gate for
 * the shipment while the incident stays flagged on the audit trail.
 */
class GpsLockService
{
    public const PENDING_COUNT_CACHE_KEY = 'gps_locks.pending_count';

    public function __construct(private readonly FakeGpsDetector $detector) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function request(Shipment $shipment, Courier $courier, array $data): GpsLockRequest
    {
        // Repeated taps while a request is pending are idempotent.
        $pending = GpsLockRequest::query()
            ->where('shipment_id', $shipment->id)
            ->where('status', 'pending')
            ->latest('created_at')
            ->first();

        if ($pending !== null) {
            return $pending;
        }

        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];
        $assessment = $this->detector->assess($shipment, $latitude, $longitude, $data);

        if ($assessment['level'] !== 'blocked' && ! $this->hasPriorBlock($shipment)) {
            abort(422, 'Lokasi perangkat tidak terdeteksi anomali. Matikan aplikasi lokasi palsu lalu coba lagi.');
        }

        $lock = DB::transaction(function () use ($shipment, $courier, $latitude, $longitude, $assessment, $data): GpsLockRequest {
            $lock = GpsLockRequest::create([
                'shipment_id' => $shipment->id,
                'courier_id' => $courier->id,
                'point' => DB::raw(Point::make($latitude, $longitude)),
                'accuracy_m' => $assessment['accuracy_m'],
                'evidence' => $assessment,
                'reason' => (string) $data['reason'],
                'status' => 'pending',
            ]);

            DeliveryEvent::create([
                'shipment_id' => $shipment->id,
                'courier_id' => $courier->id,
                'event_type' => 'gps_lock_requested',
                'point' => DB::raw(Point::make($latitude, $longitude)),
                'actor_type' => 'courier',
                'metadata' => [
                    'lock' => $lock->id,
                    'reason' => $lock->reason,
                    'reasons' => $assessment['reasons'],
                ],
            ]);

            $this->detector->flag($shipment, $assessment);

            return $lock;
        });

        self::forgetCaches();

        return $lock->refresh();
    }

    public function decide(GpsLockRequest $lock, Admin $admin, string $decision, ?string $note = null): GpsLockRequest
    {
        $lock->update([
            'status' => $decision,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Date::now(),
            'review_note' => $note,
        ]);

        DeliveryEvent::create([
            'shipment_id' => $lock->shipment_id,
            'courier_id' => $lock->courier_id,
            'event_type' => 'gps_lock_decided',
            'actor_type' => 'admin',
            'metadata' => ['decision' => $decision, 'note' => $note, 'lock' => $lock->id],
        ]);

        AdminAction::create([
            'admin_id' => $admin->id,
            'action_type' => $decision === 'approved' ? 'approve_gps_lock' : 'reject_gps_lock',
            'target_type' => 'gps_lock_request',
            'target_id' => $lock->id,
            'reason' => $note,
        ]);

        self::forgetCaches();

        return $lock->refresh();
    }

    private function hasPriorBlock(Shipment $shipment): bool
    {
        return DeliveryEvent::query()
            ->where('shipment_id', $shipment->id)
            ->where('event_type', 'gps_blocked')
            ->exists();
    }

    private static function forgetCaches(): void
    {
        Cache::forget(self::PENDING_COUNT_CACHE_KEY);
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();
    }
}
